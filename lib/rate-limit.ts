/**
 * In-memory token-bucket rate limiter — zero deps, suitable for single-replica
 * deployments. For multi-replica, swap the Map for Redis (Upstash @upstash/ratelimit
 * drop-in replacement).
 *
 * Usage:
 *   const allowed = checkRate('bot-api:' + ip, { limit: 30, windowMs: 60_000 })
 *   if (!allowed) return NextResponse.json({error:'rate limited'}, {status: 429})
 */

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

// Janitor — drop buckets older than 10 min so memory doesn't grow forever.
let lastSweep = Date.now()
function maybeSweep() {
  const now = Date.now()
  if (now - lastSweep < 60_000) return
  lastSweep = now
  const cutoff = now - 10 * 60_000
  for (const [k, b] of buckets) {
    if (b.lastRefill < cutoff) buckets.delete(k)
  }
}

export interface RateLimitOptions {
  limit: number      // max requests per window
  windowMs: number   // refill interval (full bucket of `limit` tokens per window)
}

/**
 * Returns true if allowed, false if rate-limited.
 * Token-bucket: refills `limit` tokens every `windowMs`.
 */
export function checkRate(key: string, opts: RateLimitOptions): boolean {
  maybeSweep()
  const now = Date.now()
  let b = buckets.get(key)
  if (!b) {
    b = { tokens: opts.limit, lastRefill: now }
    buckets.set(key, b)
  }
  // Refill proportionally to elapsed time.
  const elapsed = now - b.lastRefill
  if (elapsed > 0) {
    const refilled = Math.floor((elapsed / opts.windowMs) * opts.limit)
    if (refilled > 0) {
      b.tokens = Math.min(opts.limit, b.tokens + refilled)
      b.lastRefill = now
    }
  }
  if (b.tokens <= 0) return false
  b.tokens -= 1
  return true
}

/**
 * Convenience: returns 429 response if rate-limited, else null.
 */
import { NextResponse } from 'next/server'
export function rateLimitOr429(key: string, opts: RateLimitOptions): NextResponse | null {
  if (checkRate(key, opts)) return null
  return NextResponse.json(
    { error: 'Rate limited', code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(opts.windowMs / 1000)) } },
  )
}
