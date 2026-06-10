import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Middleware hardening plan:
// - Keep bot/webhook traffic functional.
// - Make scanner/honeypot state expiring + bounded so attackers cannot memory-DOS the edge runtime.
// - Sync both IP and userId blacklists from Node routes into Edge middleware.
// - Apply low-risk security headers to every matched response.

const PROBE_WINDOW = 60_000 // 60 seconds
const PROBE_THRESHOLD = 15 // 15+ unique API paths in 60s = flagged
const MAX_TRACKED_KEYS = 10_000
const MAX_PATHS_PER_PROBE_ENTRY = 40
const CLEANUP_INTERVAL = 5 * 60 * 1000
const SCANNER_BLACKLIST_TTL = 6 * 60 * 60 * 1000 // 6h: enough to stop scanners, not forever for recycled IPs
const SYNC_BLACKLIST_TTL = 24 * 60 * 60 * 1000 // 24h edge cache; DB remains authoritative server-side

// Scanner trap paths ? no legitimate user should hit these.
const SCANNER_TRAPS = new Set([
  '/.env', '/.env.local', '/.env.production',
  '/.git/config', '/.git/HEAD', '/.gitignore',
  '/wp-admin', '/wp-login.php', '/wp-content', '/xmlrpc.php',
  '/phpmyadmin', '/pma', '/adminer', '/adminer.php',
  '/api/debug', '/api/config', '/api/env', '/api/graphql',
  '/backup.sql', '/dump.sql', '/database.sql', '/db.sql',
  '/server-status', '/server-info',
  '/.DS_Store', '/web.config', '/crossdomain.xml',
  '/config.php', '/config.json', '/config.yml',
  '/admin/login', '/administrator',
  '/.htaccess', '/.htpasswd',
  '/actuator', '/actuator/health',
  '/api/v2/swagger.json', '/swagger-ui.html',
  // Vendor honeypots
  '/api/vendor/admin', '/api/vendor/config', '/api/vendor/debug',
  '/api/vendor/settings', '/api/vendor/export',
  '/vendor/debug', '/vendor/admin', '/vendor/config',
])

// Honeypot webhook for scanner alerts (fire-and-forget, cannot use lib in Edge).
const HP_WEBHOOK = process.env.HONEYPOT_WEBHOOK_URL || ''

// Expiring in-memory blacklist caches synced from honeypot routes.
// Map value is expiresAt ms.
const blacklistedIps = new Map<string, number>()
const blacklistedUserIds = new Map<string, number>()

// API path enumeration tracker: IP -> { paths, firstSeen }.
const apiProbeTracker = new Map<string, { paths: Set<string>; firstSeen: number }>()

// In-memory rate limit store: key -> { count, resetTime }.
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Auth lockout store: IP -> { attempts, firstAttempt, lockedUntil }.
const authLockoutStore = new Map<string, { attempts: number; firstAttempt: number; lockedUntil: number }>()

const AUTH_LOCKOUT_THRESHOLD = 25
const AUTH_LOCKOUT_WINDOW = 5 * 60_000
const AUTH_LOCKOUT_DURATION = 15 * 60_000

let lastCleanup = Date.now()

function sanitizeHeader(value: string | null | undefined, maxLen = 200): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').slice(0, maxLen)
}

function normalizeIpToken(value: string | null | undefined): string | null {
  if (!value) return null
  let token = value.split(',')[0]?.trim() || ''
  if (!token) return null

  // Strip IPv4 port form: 203.0.113.10:443. Leave IPv6 alone.
  const ipv4WithPort = token.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/)
  if (ipv4WithPort) token = ipv4WithPort[1]

  // Strip bracketed IPv6 form: [2001:db8::1].
  if (token.startsWith('[') && token.includes(']')) {
    token = token.slice(1, token.indexOf(']'))
  }

  if (token === 'localhost') return token
  if (!/^[a-f0-9:.]{3,45}$/i.test(token)) return null
  if (token.toLowerCase() === 'unknown') return null
  return token
}

function getClientIp(request: NextRequest): string {
  // Prefer headers set by trusted edge/proxy providers. Do not use arbitrary long
  // values as map keys; normalize every candidate first.
  return normalizeIpToken(request.headers.get('cf-connecting-ip'))
    || normalizeIpToken(request.headers.get('true-client-ip'))
    || normalizeIpToken(request.headers.get('x-real-ip'))
    || normalizeIpToken(request.headers.get('x-forwarded-for'))
    || '0.0.0.0'
}

function canBlacklistIp(ip: string): boolean {
  return ip !== '0.0.0.0' && ip !== '127.0.0.1' && ip !== '::1' && ip !== 'localhost'
}

function pruneExpiringMap(map: Map<string, number>, now = Date.now(), maxSize = MAX_TRACKED_KEYS) {
  for (const [key, expiresAt] of map) {
    if (expiresAt <= now) map.delete(key)
  }
  while (map.size > maxSize) {
    const first = map.keys().next().value as string | undefined
    if (!first) break
    map.delete(first)
  }
}

function addBlacklistedIp(ip: string, ttlMs = SCANNER_BLACKLIST_TTL) {
  if (!canBlacklistIp(ip)) return
  pruneExpiringMap(blacklistedIps)
  blacklistedIps.set(ip, Date.now() + ttlMs)
}

function addBlacklistedUserId(userId: string, ttlMs = SYNC_BLACKLIST_TTL) {
  const normalized = userId.trim().slice(0, 80)
  if (!normalized) return
  pruneExpiringMap(blacklistedUserIds)
  blacklistedUserIds.set(normalized, Date.now() + ttlMs)
}

function isExpiringBlacklisted(map: Map<string, number>, key: string): boolean {
  const expiresAt = map.get(key)
  if (!expiresAt) return false
  if (expiresAt <= Date.now()) {
    map.delete(key)
    return false
  }
  return true
}

function pruneTrackerMaps(now = Date.now()) {
  pruneExpiringMap(blacklistedIps, now)
  pruneExpiringMap(blacklistedUserIds, now)

  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) rateLimitStore.delete(key)
  })
  while (rateLimitStore.size > MAX_TRACKED_KEYS) {
    const first = rateLimitStore.keys().next().value as string | undefined
    if (!first) break
    rateLimitStore.delete(first)
  }

  authLockoutStore.forEach((value, key) => {
    if (now > value.lockedUntil && now > value.firstAttempt + AUTH_LOCKOUT_WINDOW) {
      authLockoutStore.delete(key)
    }
  })
  while (authLockoutStore.size > MAX_TRACKED_KEYS) {
    const first = authLockoutStore.keys().next().value as string | undefined
    if (!first) break
    authLockoutStore.delete(first)
  }

  apiProbeTracker.forEach((value, key) => {
    if (now - value.firstSeen > PROBE_WINDOW) apiProbeTracker.delete(key)
  })
  while (apiProbeTracker.size > MAX_TRACKED_KEYS) {
    const first = apiProbeTracker.keys().next().value as string | undefined
    if (!first) break
    apiProbeTracker.delete(first)
  }
}

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  pruneTrackerMaps(now)
}

function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  if (!response.headers.has('Content-Security-Policy')) {
    response.headers.set('Content-Security-Policy', "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'")
  }

  if (request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

function next(request: NextRequest): NextResponse {
  return applySecurityHeaders(NextResponse.next(), request)
}

function empty(status: number, request: NextRequest, headers?: HeadersInit): NextResponse {
  return applySecurityHeaders(new NextResponse(null, { status, headers }), request)
}

function text(body: string, status: number, request: NextRequest, headers?: HeadersInit): NextResponse {
  return applySecurityHeaders(new NextResponse(body, { status, headers }), request)
}

function json(body: unknown, status: number, request: NextRequest, headers?: HeadersInit): NextResponse {
  return applySecurityHeaders(new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(headers || {}),
    },
  }), request)
}

function redirect(url: URL, request: NextRequest, status = 301): NextResponse {
  return applySecurityHeaders(NextResponse.redirect(url, status), request)
}

function sendHoneypotAlert(ip: string, path: string, ua: string, reason: string) {
  if (!HP_WEBHOOK) return
  fetch(HP_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: 'Honeypot Triggered',
        color: 0xff0000,
        fields: [
          { name: 'IP', value: ip, inline: true },
          { name: 'Path', value: path, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'User-Agent', value: sanitizeHeader(ua || 'none', 200), inline: false },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(err => {
    console.warn('[honeypot-alert] webhook failed:', err instanceof Error ? err.message : String(err))
  })
}

function trackApiProbe(ip: string, pathname: string): boolean {
  const now = Date.now()
  let entry = apiProbeTracker.get(ip)

  if (!entry || now - entry.firstSeen > PROBE_WINDOW) {
    entry = { paths: new Set(), firstSeen: now }
    apiProbeTracker.set(ip, entry)
  }

  entry.paths.add(pathname.slice(0, 240))

  // Avoid per-IP path-set memory blowups even below the flag threshold.
  if (entry.paths.size > MAX_PATHS_PER_PROBE_ENTRY) {
    apiProbeTracker.delete(ip)
    return true
  }

  if (entry.paths.size >= PROBE_THRESHOLD) {
    apiProbeTracker.delete(ip)
    return true
  }
  return false
}

function getRateLimit(pathname: string): { max: number; windowMs: number } {
  if (pathname === '/api/internal/blacklist-sync') return { max: 5, windowMs: 60_000 }
  if (pathname === '/api/auth/me' || pathname === '/api/auth/logout') return { max: 30, windowMs: 60_000 }
  if (pathname === '/api/auth/log' || pathname === '/api/client-errors') return { max: 20, windowMs: 60_000 }
  if (pathname.startsWith('/api/auth/discord')) return { max: 10, windowMs: 60_000 }
  if (pathname.startsWith('/api/auth') || pathname === '/redirect') return { max: 10, windowMs: 60_000 }
  if (pathname.startsWith('/api/deposits')) return { max: 10, windowMs: 60_000 }
  if (pathname.startsWith('/api/vault')) return { max: 12, windowMs: 60_000 }
  if (pathname.startsWith('/api/orders/purchase')) return { max: 10, windowMs: 60_000 }
  if (pathname.startsWith('/api/orders')) return { max: 30, windowMs: 60_000 }
  if (pathname === '/api/bot/vendor-deposit') return { max: 20, windowMs: 60_000 }
  if (pathname.startsWith('/api/bot')) return { max: 60, windowMs: 60_000 }
  if (pathname.startsWith('/api/cron')) return { max: 30, windowMs: 60_000 }
  if (pathname.startsWith('/api/vendor')) return { max: 20, windowMs: 60_000 }
  if (pathname.startsWith('/api/admin')) return { max: 20, windowMs: 60_000 }
  return { max: 30, windowMs: 60_000 }
}

function rateLimitPathKey(pathname: string): string {
  if (pathname.startsWith('/api/auth') || pathname === '/api/orders/purchase' || pathname.startsWith('/api/vault')) {
    return pathname
  }
  return pathname.split('/').slice(0, 3).join('/') || pathname
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter: number } {
  cleanup()
  const { max, windowMs } = getRateLimit(pathname)
  const key = `${ip}:${rateLimitPathKey(pathname)}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  entry.count++
  if (entry.count > max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) }
  }

  return { allowed: true, retryAfter: 0 }
}

function checkAuthLockout(ip: string): { locked: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = authLockoutStore.get(ip)

  if (!entry) {
    authLockoutStore.set(ip, { attempts: 1, firstAttempt: now, lockedUntil: 0 })
    return { locked: false, retryAfter: 0 }
  }

  if (now < entry.lockedUntil) {
    return { locked: true, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) }
  }

  if (now > entry.firstAttempt + AUTH_LOCKOUT_WINDOW) {
    authLockoutStore.set(ip, { attempts: 1, firstAttempt: now, lockedUntil: 0 })
    return { locked: false, retryAfter: 0 }
  }

  entry.attempts++
  if (entry.attempts > AUTH_LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + AUTH_LOCKOUT_DURATION
    return { locked: true, retryAfter: Math.ceil(AUTH_LOCKOUT_DURATION / 1000) }
  }

  return { locked: false, retryAfter: 0 }
}

// Auth initiation endpoints that should have strict lockout protection.
// Only actual login flows ? Discord link/unlink should NOT trigger lockout.
function isAuthInitiationEndpoint(pathname: string): boolean {
  return pathname === '/api/auth/roblox' || pathname === '/redirect'
}

function isAuthPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth') || pathname === '/redirect'
}

function isStateChangingMethod(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
}

function allowedOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>(['https://sniperduels.shop', 'https://www.sniperduels.shop'])
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl) {
    try { origins.add(new URL(baseUrl).origin) } catch { /* ignore malformed env */ }
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add(request.nextUrl.origin)
    origins.add('http://localhost:3000')
    origins.add('http://127.0.0.1:3000')
  }
  return origins
}

function passesCsrfChecks(request: NextRequest): boolean {
  if (!isStateChangingMethod(request.method)) return true

  const origin = request.headers.get('origin')
  if (origin && !allowedOrigins(request).has(origin)) return false

  // Browser-initiated cross-site POSTs should never hit state-changing endpoints.
  // Server-to-server bots/webhooks usually omit Sec-Fetch-* and are already auth/signature gated.
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite === 'cross-site') return false

  return true
}

async function getSessionUserId(request: NextRequest): Promise<string | null> {
  if (blacklistedUserIds.size === 0) return null
  const token = request.cookies.get('session')?.value
  const secret = process.env.SESSION_SECRET
  if (!token || !secret) return null

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    const maybeUser = (payload as { user?: { id?: unknown } }).user
    return typeof maybeUser?.id === 'string' ? maybeUser.id.slice(0, 80) : null
  } catch {
    return null
  }
}

async function handleInternalBlacklistSync(request: NextRequest, ip: string): Promise<NextResponse> {
  // This endpoint is invoked by Node routes via NEXT_PUBLIC_BASE_URL, so loopback
  // checks break in production. Harden with method + shared secret + tiny body.
  const syncSecret = request.headers.get('x-internal-secret')
  if (request.method !== 'POST' || !process.env.SESSION_SECRET || syncSecret !== process.env.SESSION_SECRET) {
    return empty(404, request)
  }

  const rate = checkRateLimit(ip, request.nextUrl.pathname)
  if (!rate.allowed) return empty(429, request, { 'Retry-After': rate.retryAfter.toString() })

  let body: { ip?: unknown; userId?: unknown; ttlMs?: unknown } = {}
  try {
    const raw = await request.text()
    if (raw.length > 2048) return empty(413, request)
    body = raw ? JSON.parse(raw) : {}
  } catch {
    return json({ error: 'invalid json' }, 400, request)
  }

  const ttlMs = typeof body.ttlMs === 'number' && Number.isFinite(body.ttlMs)
    ? Math.max(60_000, Math.min(body.ttlMs, 7 * 24 * 60 * 60 * 1000))
    : SYNC_BLACKLIST_TTL

  const syncIp = normalizeIpToken(typeof body.ip === 'string' ? body.ip : null)
  const userId = typeof body.userId === 'string' ? body.userId : ''

  if (syncIp) addBlacklistedIp(syncIp, ttlMs)
  if (userId) addBlacklistedUserId(userId, ttlMs)

  return empty(204, request)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Block dev pages in production/preview; only allow locally.
  if (pathname.startsWith('/dev') && process.env.NODE_ENV === 'production') {
    return empty(404, request)
  }

  // Redirect old /vendor routes to /dashboard/vendor, but leave traps intact.
  if (pathname.startsWith('/vendor') && !pathname.startsWith('/vendor/debug') && !pathname.startsWith('/vendor/admin') && !pathname.startsWith('/vendor/config')) {
    const newPath = pathname.replace(/^\/vendor/, '/dashboard/vendor')
    return redirect(new URL(newPath + request.nextUrl.search, request.url), request, 301)
  }

  const ip = getClientIp(request)

  if (pathname === '/api/internal/blacklist-sync') {
    return handleInternalBlacklistSync(request, ip)
  }

  // Webhook endpoints: skip CSRF but cap volume. Signature verification in the route is authoritative.
  if (pathname.startsWith('/api/webhooks/')) {
    const whKey = `${ip}:/api/webhooks`
    const now = Date.now()
    const whEntry = rateLimitStore.get(whKey)
    if (!whEntry || now > whEntry.resetTime) {
      rateLimitStore.set(whKey, { count: 1, resetTime: now + 60_000 })
    } else {
      whEntry.count++
      if (whEntry.count > 120) return empty(429, request)
    }
    return next(request)
  }

  // Blacklist check: return fake empty API data for blacklisted IPs/users, but never block auth flows.
  if (isExpiringBlacklisted(blacklistedIps, ip)) {
    if (pathname.startsWith('/api/') && !isAuthPath(pathname)) {
      return json({ users: [], orders: [], items: [], total: 0 }, 200, request)
    }
  }

  const sessionUserId = await getSessionUserId(request)
  if (sessionUserId && isExpiringBlacklisted(blacklistedUserIds, sessionUserId)) {
    if (pathname.startsWith('/api/') && !isAuthPath(pathname)) {
      return json({ users: [], orders: [], items: [], total: 0 }, 200, request)
    }
  }

  // Scanner trap detection: catch automated vulnerability scanners.
  const lowerPath = pathname.toLowerCase()
  if (SCANNER_TRAPS.has(lowerPath)) {
    addBlacklistedIp(ip)
    const ua = request.headers.get('user-agent') || ''
    sendHoneypotAlert(ip, lowerPath, ua, 'Scanner trap path accessed')

    // Random delay (1-3s) to make traps less useful for fast enumeration.
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    if (lowerPath.endsWith('.sql')) {
      return text('-- MySQL dump\n-- Server version 8.0.32\n-- Dumping data for table `users`\n-- 0 rows\n', 200, request, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      })
    }
    if (lowerPath === '/.env' || lowerPath === '/.env.local' || lowerPath === '/.env.production') {
      return text('DATABASE_URL=postgres://readonly:demo@localhost:5432/demo\nSECRET_KEY=not-a-real-key-nice-try\nSTRIPE_KEY=sk_test_fake\n', 200, request, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      })
    }
    if (lowerPath.startsWith('/.git')) {
      return text('[core]\n\trepositoryformatversion = 0\n\tbare = false\n', 200, request, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      })
    }
    if (lowerPath.includes('/vendor')) {
      return json({ vendors: [], config: { feeRate: 0.05, maxStock: 500, payoutSchedule: 'weekly' }, debug: false }, 200, request)
    }
    return text('OK', 200, request, { 'Cache-Control': 'no-store' })
  }

  // API path enumeration detection: flag IPs probing many unique endpoints.
  const isExemptPath = pathname.startsWith('/api/admin/') || pathname.startsWith('/api/auth/') || pathname.startsWith('/api/bot/') || pathname.startsWith('/api/cron/')
  if (pathname.startsWith('/api/') && !isExemptPath) {
    const isProbing = trackApiProbe(ip, pathname)
    if (isProbing) {
      addBlacklistedIp(ip)
      const ua = request.headers.get('user-agent') || ''
      sendHoneypotAlert(ip, pathname, ua, `API enumeration: ${PROBE_THRESHOLD}+ unique paths in ${PROBE_WINDOW / 1000}s`)
    }
  }

  if (!passesCsrfChecks(request)) {
    return json({ error: 'CSRF validation failed' }, 403, request)
  }

  // The broad matcher is for security headers on pages. Rate-limit only API/auth
  // surfaces; do not throttle normal page navigation.
  if (!pathname.startsWith('/api/') && pathname !== '/redirect') {
    return next(request)
  }

  // Auth initiation endpoints: strict lockout + rate limiting (no localhost bypass).
  if (isAuthInitiationEndpoint(pathname)) {
    const lockout = checkAuthLockout(ip)
    if (lockout.locked) {
      const ua = sanitizeHeader(request.headers.get('user-agent') || 'unknown', 120)
      console.log(`[Auth Lockout] ip=${ip} path=${pathname} retry_after=${lockout.retryAfter}s ua=${ua}`)
      return json({ error: 'Too many authentication attempts. Please try again later.' }, 429, request, {
        'Retry-After': lockout.retryAfter.toString(),
      })
    }

    const { allowed, retryAfter } = checkRateLimit(ip, pathname)
    if (!allowed) {
      const ua = sanitizeHeader(request.headers.get('user-agent') || 'unknown', 120)
      console.log(`[Auth Rate Limit] ip=${ip} path=${pathname} retry_after=${retryAfter}s ua=${ua}`)
      return json({ error: 'Too many requests' }, 429, request, {
        'Retry-After': retryAfter.toString(),
      })
    }

    return next(request)
  }

  // Non-auth endpoints: skip rate limiting for localhost in development only.
  const isLocal = process.env.NODE_ENV !== 'production'
    && (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost')
  if (isLocal) return next(request)

  const { allowed, retryAfter } = checkRateLimit(ip, pathname)
  if (!allowed) {
    return json({ error: 'Too many requests' }, 429, request, {
      'Retry-After': retryAfter.toString(),
    })
  }

  return next(request)
}

export const config = {
  matcher: [
    // Run on dynamic pages/APIs so security headers apply broadly, but skip static assets.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|woff|woff2|ttf)$).*)',
    // Explicit traps that look like static files and would otherwise be skipped.
    '/.env', '/.env.local', '/.env.production',
    '/.git/:path*', '/.gitignore',
    '/backup.sql', '/dump.sql', '/database.sql', '/db.sql',
    '/.DS_Store', '/web.config', '/crossdomain.xml',
    '/config.php', '/config.json', '/config.yml',
    '/.htaccess', '/.htpasswd',
    '/swagger-ui.html',
  ],
}
