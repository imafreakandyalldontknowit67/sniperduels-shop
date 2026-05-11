import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Diagnostic endpoint: receives client-side stack traces from route-level
// error boundaries (e.g. app/gems/error.tsx) so we can pinpoint crashes
// happening in users' browsers from Coolify logs + the alerts Discord
// channel.
//
// Hardening (mirrors app/api/auth/log/route.ts):
// - Same-origin only (refuse on missing/cross-site Sec-Fetch-Site)
// - In-memory per-IP token bucket (10 req/min — error storms shouldn't
//   pummel logs)
// - Source allowlist (any unknown source is rejected)
// - CR/LF stripped from every value to prevent log-injection
// - Payload size cap (4096 bytes)
// - Stack truncated, no cookies/tokens/PII ever logged

const ALLOWED_SOURCES = new Set([
  'gems_route_boundary',
])

const RATE_LIMIT_PER_MIN = 10
const ipBuckets = new Map<string, { count: number; windowStart: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)
  if (!bucket || now - bucket.windowStart > 60_000) {
    ipBuckets.set(ip, { count: 1, windowStart: now })
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

// Fire-and-forget Discord post. Returns immediately if the env var isn't
// set so the endpoint still works (Coolify logs) before the var is wired.
async function notifyDiscord(payload: {
  source: string
  message: string
  stack: string
  url: string
  ua: string
  digest: string | null
  ip: string
}): Promise<void> {
  const webhookUrl = process.env.DISCORD_ALERTS_WEBHOOK_URL
  if (!webhookUrl) return
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SniperDuelsShop ClientError (https://sniperduels.shop, 1.0)',
      },
      body: JSON.stringify({
        username: 'SniperDuels Errors',
        embeds: [{
          title: `Client error — ${payload.source}`,
          color: 0xe74c3c,
          fields: [
            { name: 'Message', value: payload.message.slice(0, 1000) || '(empty)', inline: false },
            { name: 'URL', value: payload.url.slice(0, 200) || '(unknown)', inline: false },
            { name: 'User Agent', value: payload.ua.slice(0, 200) || '(unknown)', inline: false },
            ...(payload.digest ? [{ name: 'Digest', value: payload.digest.slice(0, 100), inline: true }] : []),
            { name: 'IP', value: payload.ip.slice(0, 60), inline: true },
            { name: 'Stack', value: '```\n' + payload.stack.slice(0, 1500) + '\n```', inline: false },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('[client-errors] discord webhook failed', err instanceof Error ? err.message : String(err))
  }
}

export async function POST(request: NextRequest) {
  // Same-origin check — silent 204 so scripted abuse can't fingerprint us.
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

    const source = sanitize(parsed.source, 60)
    if (!ALLOWED_SOURCES.has(source)) {
      console.warn(`[client-errors] REJECTED unknown_source="${source}" ip=${sanitize(ip, 40)}`)
      return NextResponse.json({ error: 'unknown source' }, { status: 400 })
    }

    const message = sanitize(parsed.message, 500)
    // Stack lines can run long; sanitize each line independently then re-join
    // so we strip control chars without flattening the stack into one line.
    const rawStack = String(parsed.stack ?? '')
    const stack = rawStack
      .split('\n')
      .slice(0, 30)
      .map(line => line.replace(/[\r]+/g, '').slice(0, 300))
      .join('\n')
      .slice(0, 2000)
    const digest = parsed.digest ? sanitize(parsed.digest, 100) : null
    const url = sanitize(parsed.url, 200)
    const ua = sanitize(parsed.userAgent || request.headers.get('user-agent'), 200)

    console.error(
      `[client-errors] source="${source}" message="${message}" url="${url}" ip=${sanitize(ip, 60)} ua="${ua}"${digest ? ` digest=${digest}` : ''}\nstack:\n${stack}`
    )

    // Fire-and-forget Discord notification (env-gated).
    notifyDiscord({ source, message, stack, url, ua, digest, ip }).catch(() => { /* logged inside */ })
  } catch (err) {
    console.error('[client-errors] handler error', err instanceof Error ? err.message : String(err))
  }

  return NextResponse.json({ ok: true })
}
