import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Diagnostic-only endpoint: receives client-side breadcrumbs from the
// /login-success page so the auth flow's browser-side steps show up in
// container logs alongside the server-side trail.
//
// Hardening:
// - Same-origin only (refuse on missing or cross-site Sec-Fetch-Site)
// - In-memory per-IP token bucket (30 req/min)
// - Stage allowlist (any unknown stage is rejected)
// - CR/LF stripped from every value to prevent log-injection
// - Payload size cap

const ALLOWED_STAGES = new Set([
  'login_success_entered',
  'login_success_no_token',
  'set_session_call',
  'set_session_result',
  'set_session_network_error',
])

const RATE_LIMIT_PER_MIN = 30
const ipBuckets = new Map<string, { count: number; windowStart: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || now - bucket.windowStart > 60_000) {
    ipBuckets.set(ip, { count: 1, windowStart: now })
    // Opportunistic prune to keep map bounded
    if (ipBuckets.size > 5_000) {
      const cutoff = now - 60_000
      for (const [k, v] of ipBuckets) if (v.windowStart < cutoff) ipBuckets.delete(k)
    }
    return true
  }
  if (bucket.count >= RATE_LIMIT_PER_MIN) return false
  bucket.count++
  return true
}

function sanitize(value: unknown, maxLen = 200): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').slice(0, maxLen)
}

export async function POST(request: NextRequest) {
  // Same-origin check — refuse with silent 204 so scripted abuse can't
  // distinguish our endpoint from a no-op.
  const sfs = request.headers.get('sec-fetch-site')
  if (sfs !== 'same-origin') {
    return new NextResponse(null, { status: 204 })
  }

  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown'

  if (!rateLimit(ip)) {
    return new NextResponse(null, { status: 429 })
  }

  try {
    const raw = await request.text()
    if (raw.length > 4096) return NextResponse.json({ ok: false }, { status: 413 })

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const stage = sanitize(parsed.stage, 60)
    if (!ALLOWED_STAGES.has(stage)) {
      console.warn(`[client-log] REJECTED unknown_stage="${stage}" ip=${sanitize(ip, 40)}`)
      return NextResponse.json({ error: 'unknown stage' }, { status: 400 })
    }

    const ua = sanitize(request.headers.get('user-agent'), 80)
    const fields: string[] = [`stage=${stage}`]
    for (const [k, v] of Object.entries(parsed)) {
      if (k === 'stage') continue
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        fields.push(`${sanitize(k, 30)}=${sanitize(v, 200)}`)
      }
    }
    console.log(`[client-log] ${fields.join(' ')} ua="${ua}"`)
  } catch (err) {
    console.error('[client-log] handler error', err instanceof Error ? err.message : String(err))
  }
  return NextResponse.json({ ok: true })
}
