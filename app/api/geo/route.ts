import { NextRequest, NextResponse } from 'next/server'
import { findRegion } from '@/lib/us-sales-tax'
// @ts-expect-error — geoip-lite has no types in this version
import geoip from 'geoip-lite'

export const dynamic = 'force-dynamic'

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
  let source: 'cf' | 'geoip' | null = region ? 'cf' : null

  // Fallback: offline IP→region lookup
  if (!region) {
    const ip = req.headers.get('cf-connecting-ip')
              || req.headers.get('x-real-ip')
              || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              || ''
    if (ip) {
      try {
        const lookup = geoip.lookup(ip)
        if (lookup?.region) {
          region = String(lookup.region).toUpperCase()
          source = 'geoip'
        }
      } catch { /* lookup error — drop silently */ }
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
