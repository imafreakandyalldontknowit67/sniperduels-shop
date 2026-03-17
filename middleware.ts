import { NextRequest, NextResponse } from 'next/server'

// In-memory blacklist (populated via /api/internal/blacklist-sync from honeypot triggers)
const blacklistedIps = new Set<string>()

// API path enumeration tracker: IP -> { paths: Set, firstSeen: timestamp }
const apiProbeTracker = new Map<string, { paths: Set<string>; firstSeen: number }>()
const PROBE_WINDOW = 60_000 // 60 seconds
const PROBE_THRESHOLD = 15 // 15+ unique API paths in 60s = flagged

// Scanner trap paths — no legitimate user would hit these
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
])

// Honeypot webhook for scanner alerts (fire-and-forget, can't use lib in Edge)
const HP_WEBHOOK = process.env.HONEYPOT_WEBHOOK_URL || ''

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
          { name: 'User-Agent', value: (ua || 'none').slice(0, 200), inline: false },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(() => {})
}

function trackApiProbe(ip: string, pathname: string): boolean {
  const now = Date.now()
  let entry = apiProbeTracker.get(ip)

  if (!entry || now - entry.firstSeen > PROBE_WINDOW) {
    entry = { paths: new Set(), firstSeen: now }
    apiProbeTracker.set(ip, entry)
  }

  entry.paths.add(pathname)

  if (entry.paths.size >= PROBE_THRESHOLD) {
    apiProbeTracker.delete(ip)
    return true // flagged
  }
  return false
}

// In-memory rate limit store: key -> { count, resetTime }
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Auth lockout store: IP -> { attempts, lockedUntil }
// Tracks failed/excessive auth attempts for lockout
const authLockoutStore = new Map<string, { attempts: number; firstAttempt: number; lockedUntil: number }>()

const AUTH_LOCKOUT_THRESHOLD = 25  // Lock after 25 auth requests in window
const AUTH_LOCKOUT_WINDOW = 5 * 60_000  // 5 minute window
const AUTH_LOCKOUT_DURATION = 15 * 60_000  // 15 minute lockout

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  rateLimitStore.forEach((value, key) => {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  })
  authLockoutStore.forEach((value, key) => {
    if (now > value.lockedUntil && now > value.firstAttempt + AUTH_LOCKOUT_WINDOW) {
      authLockoutStore.delete(key)
    }
  })
}

function getRateLimit(pathname: string): { max: number; windowMs: number } {
  if (pathname === '/api/auth/me' || pathname === '/api/auth/logout') {
    return { max: 30, windowMs: 60_000 } // 30 per minute for session checks (not login attempts)
  }
  if (pathname.startsWith('/api/auth/discord')) {
    return { max: 10, windowMs: 60_000 } // 10 per minute for Discord link/unlink (account management)
  }
  if (pathname.startsWith('/api/auth') || pathname === '/redirect') {
    return { max: 10, windowMs: 60_000 } // 10 per minute for auth
  }
  if (pathname.startsWith('/api/deposits')) {
    return { max: 10, windowMs: 60_000 } // 10 per minute for payment operations
  }
  if (pathname.startsWith('/api/orders/purchase')) {
    return { max: 10, windowMs: 60_000 } // 10 per minute for purchases
  }
  if (pathname.startsWith('/api/orders')) {
    return { max: 30, windowMs: 60_000 } // 30 per minute (order tracking polls every 5s)
  }
  if (pathname.startsWith('/api/bot')) {
    return { max: 60, windowMs: 60_000 } // 60 per minute for bot polling
  }
  if (pathname.startsWith('/api/admin')) {
    return { max: 20, windowMs: 60_000 } // 20 per minute for admin
  }
  return { max: 30, windowMs: 60_000 } // 30 per minute for public API
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter: number } {
  cleanup()
  const { max, windowMs } = getRateLimit(pathname)
  // Use full pathname for auth endpoints so /api/auth/me, /api/auth/discord, etc.
  // each get their own rate limit bucket instead of sharing one
  const pathKey = pathname.startsWith('/api/auth') || pathname === '/api/orders/purchase'
    ? pathname
    : pathname.split('/').slice(0, 3).join('/')
  const key = `${ip}:${pathKey}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  entry.count++
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true, retryAfter: 0 }
}

// Check if IP is locked out from auth endpoints due to excessive attempts
function checkAuthLockout(ip: string): { locked: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = authLockoutStore.get(ip)

  if (!entry) {
    authLockoutStore.set(ip, { attempts: 1, firstAttempt: now, lockedUntil: 0 })
    return { locked: false, retryAfter: 0 }
  }

  // Currently locked out
  if (now < entry.lockedUntil) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000)
    return { locked: true, retryAfter }
  }

  // Window expired, reset
  if (now > entry.firstAttempt + AUTH_LOCKOUT_WINDOW) {
    authLockoutStore.set(ip, { attempts: 1, firstAttempt: now, lockedUntil: 0 })
    return { locked: false, retryAfter: 0 }
  }

  // Within window, increment
  entry.attempts++
  if (entry.attempts > AUTH_LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + AUTH_LOCKOUT_DURATION
    const retryAfter = Math.ceil(AUTH_LOCKOUT_DURATION / 1000)
    return { locked: true, retryAfter }
  }

  return { locked: false, retryAfter: 0 }
}

// Auth initiation endpoints that should have strict lockout protection.
// Only actual login flows — Discord link/unlink should NOT trigger lockout.
function isAuthInitiationEndpoint(pathname: string): boolean {
  return pathname === '/api/auth/roblox' || pathname === '/redirect'
}

function isAuthEndpoint(pathname: string): boolean {
  return pathname.startsWith('/api/auth') || pathname === '/redirect'
}

export function middleware(request: NextRequest) {
  // Block dev pages in production
  if (request.nextUrl.pathname.startsWith('/dev')) {
    return new NextResponse(null, { status: 404 })
  }

  // Use a verified proxy header or the real connecting IP.
  // cf-connecting-ip is set by Cloudflare (trusted reverse proxy) and cannot be spoofed.
  // x-forwarded-for is only used as a last resort and is NOT trusted for rate limiting
  // in production — deploy behind a trusted proxy that sets cf-connecting-ip.
  const ip = request.headers.get('cf-connecting-ip')
    || request.ip
    || request.headers.get('x-real-ip')
    || '127.0.0.1'

  // Webhook endpoints: skip CSRF and rate limiting (signature verification handles security)
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    return NextResponse.next()
  }

  // Internal blacklist sync endpoint (called by honeypot routes to update middleware's in-memory set)
  if (request.nextUrl.pathname === '/api/internal/blacklist-sync') {
    const syncIp = request.nextUrl.searchParams.get('ip')
    const syncSecret = request.nextUrl.searchParams.get('secret')
    if (syncIp && syncSecret === process.env.SESSION_SECRET) {
      blacklistedIps.add(syncIp)
    }
    return new NextResponse(null, { status: 204 })
  }

  // Blacklist check: silently return fake/empty responses for blacklisted IPs
  if (blacklistedIps.has(ip)) {
    const pathname = request.nextUrl.pathname
    // API requests get fake empty data
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ users: [], orders: [], items: [], total: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    // Page requests pass through (they see the site but API calls return nothing)
  }

  // Scanner trap detection: catch automated vulnerability scanners
  const lowerPath = request.nextUrl.pathname.toLowerCase()
  if (SCANNER_TRAPS.has(lowerPath)) {
    blacklistedIps.add(ip)
    const ua = request.headers.get('user-agent') || ''
    sendHoneypotAlert(ip, lowerPath, ua, 'Scanner trap path accessed')

    // Return convincing fake responses based on what they're looking for
    if (lowerPath.endsWith('.sql')) {
      return new NextResponse('-- MySQL dump\n-- Server version 8.0.32\n-- Dumping data for table `users`\n-- 0 rows\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    if (lowerPath === '/.env' || lowerPath === '/.env.local' || lowerPath === '/.env.production') {
      return new NextResponse('DATABASE_URL=postgres://readonly:demo@localhost:5432/demo\nSECRET_KEY=not-a-real-key-nice-try\nSTRIPE_KEY=sk_test_fake\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    if (lowerPath.startsWith('/.git')) {
      return new NextResponse('[core]\n\trepositoryformatversion = 0\n\tbare = false\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
    // Everything else: generic 200
    return new NextResponse('OK', { status: 200 })
  }

  // API path enumeration detection: flag IPs probing many unique endpoints
  // Skip admin/auth/bot paths — legitimate users hit many of these at once
  const apiPath = request.nextUrl.pathname
  const isExemptPath = apiPath.startsWith('/api/admin/') || apiPath.startsWith('/api/auth/') || apiPath.startsWith('/api/bot/')
  if (apiPath.startsWith('/api/') && !isExemptPath) {
    const isProbing = trackApiProbe(ip, apiPath)
    if (isProbing) {
      blacklistedIps.add(ip)
      const ua = request.headers.get('user-agent') || ''
      sendHoneypotAlert(ip, request.nextUrl.pathname, ua, `API enumeration: ${PROBE_THRESHOLD}+ unique paths in ${PROBE_WINDOW / 1000}s`)
    }
  }

  // CSRF protection: reject state-changing requests from foreign origins
  const method = request.method
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const origin = request.headers.get('origin')
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const allowedOrigin = new URL(baseUrl).origin

    // Allow requests with no origin (same-origin navigations, curl, bot)
    // but reject requests from a different origin
    if (origin && origin !== allowedOrigin) {
      return new NextResponse(
        JSON.stringify({ error: 'CSRF validation failed' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }

  const pathname = request.nextUrl.pathname

  // Auth initiation endpoints: strict lockout + rate limiting (no localhost bypass)
  if (isAuthInitiationEndpoint(pathname)) {
    // Check lockout first
    const lockout = checkAuthLockout(ip)
    if (lockout.locked) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many authentication attempts. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': lockout.retryAfter.toString(),
          },
        }
      )
    }

    // Then check per-endpoint rate limit
    const { allowed, retryAfter } = checkRateLimit(ip, pathname)
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        }
      )
    }

    return NextResponse.next()
  }

  // Other auth endpoints (/api/auth/me, /api/auth/logout) are session management,
  // not login attempts — fall through to normal rate limiting with localhost bypass.

  // Non-auth endpoints: skip rate limiting for localhost in development
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost'
  if (isLocal) return NextResponse.next()

  const { allowed, retryAfter } = checkRateLimit(ip, pathname)

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
        },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*', '/redirect', '/dev/:path*',
    // Scanner trap paths
    '/.env', '/.env.local', '/.env.production',
    '/.git/:path*', '/.gitignore',
    '/wp-admin', '/wp-login.php', '/wp-content', '/xmlrpc.php',
    '/phpmyadmin', '/pma', '/adminer', '/adminer.php',
    '/backup.sql', '/dump.sql', '/database.sql', '/db.sql',
    '/server-status', '/server-info',
    '/.DS_Store', '/web.config', '/crossdomain.xml',
    '/config.php', '/config.json', '/config.yml',
    '/admin/login', '/administrator',
    '/.htaccess', '/.htpasswd',
    '/actuator', '/actuator/:path*',
    '/swagger-ui.html',
  ],
}
