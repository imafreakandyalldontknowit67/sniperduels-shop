import { NextRequest, NextResponse } from 'next/server'
import { findRegion } from '@/lib/us-sales-tax'

export const dynamic = 'force-dynamic'

// Cheap in-process cache to avoid hammering the free IP-geo API on repeat
// loads of the deposit page from the same client. ~1h TTL is fine — IPs don't
// jump states frequently and this is just a tax-preview hint anyway.
const ipCache = new Map<string, { region: string | null; t: number }>()
const IP_CACHE_TTL_MS = 60 * 60 * 1000

async function lookupRegionByIp(ip: string): Promise<string | null> {
  const cached = ipCache.get(ip)
  if (cached && Date.now() - cached.t < IP_CACHE_TTL_MS) return cached.region
  try {
    // ip-api.com — free, no token, 45 req/min from origin server. We hit it
    // once per unique customer IP per hour, well under the limit.
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,region`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) { ipCache.set(ip, { region: null, t: Date.now() }); return null }
    const j = await res.json() as { status?: string; region?: string }
    const region = j.status === 'success' && j.region ? String(j.region).toUpperCase() : null
    ipCache.set(ip, { region, t: Date.now() })
    return region
  } catch {
    ipCache.set(ip, { region: null, t: Date.now() })
    return null
  }
}

/**
 * Detect the customer's tax region.
 * Cloudflare's FREE plan only passes `cf-ipcountry` — state-level info
 * (`cf-region-code`) requires Pro+. So we fall back to offline IP→region
 * lookup via geoip-lite when CF doesn't give us the state directly.
 *
 * The deposit page uses this to pre-fill and lock the tax estimate. We
 * never let the customer lower the estimate by picking a no-tax region
 * from the UI — Pandabase computes the real tax from their billing
 * address regardless.
 */
export async function GET(req: NextRequest) {
  const country = (req.headers.get('cf-ipcountry') || '').toUpperCase()
  let region = (req.headers.get('cf-region-code') || req.headers.get('cf-region') || '').toUpperCase()
  let source: 'cf' | 'ipapi' | null = region ? 'cf' : null

  // Fallback: server-side IP→region lookup (free CF doesn't pass cf-region-code)
  if (!region) {
    const ip = req.headers.get('cf-connecting-ip')
              || req.headers.get('x-real-ip')
              || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              || ''
    if (ip) {
      const r = await lookupRegionByIp(ip)
      if (r) {
        region = r
        source = 'ipapi'
      }
    }
  }

  let code: string | null = null
  if (country === 'US' && region) code = `US-${region}`
  else if (country === 'AU' && region) code = `AU-${region}`
  else if (country === 'CA' && region) code = `CA-${region}`
  else if (country === 'GB' || country === 'DE' || country === 'NZ' || country === 'RS') code = country

  const found = code ? findRegion(code) : null

  return NextResponse.json({
    detected: !!found,
    regionCode: found?.code ?? null,
    label: found?.label ?? null,
    rate: found?.rate ?? null,
    raw: { country, region, source },
  })
}
