import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limit store: key -> { count, resetTime }
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Auth lockout store: IP -> { attempts, lockedUntil }
// Tracks failed/excessive auth attempts for lockout
const authLockoutStore = new Map<string, { attempts: number; firstAttempt: number; lockedUntil: number }>()

const AUTH_LOCKOUT_THRESHOLD = 15  // Lock after 15 auth requests in window
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
  if (pathname.startsWith('/api/auth') || pathname === '/redirect') {
    return { max: 5, windowMs: 60_000 } // 5 per minute for auth (stricter)
  }
  if (pathname.startsWith('/api/deposits')) {
    return { max: 10, windowMs: 60_000 } // 10 per minute for payment operations
  }
  if (pathname.startsWith('/api/orders/purchase')) {
    return { max: 5, windowMs: 60_000 } // 5 per minute for purchases (financial operations)
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
  const key = `${ip}:${pathname.split('/').slice(0, 3).join('/')}`
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
  matcher: ['/api/:path*', '/redirect', '/dev/:path*'],
}
