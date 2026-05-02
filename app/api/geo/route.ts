import { NextRequest, NextResponse } from 'next/server'
import { findRegion } from '@/lib/us-sales-tax'

export const dynamic = 'force-dynamic'

// Lazy require so Webpack doesn't try to bundle the .dat data files at build time.
const geoip: { lookup: (ip: string) => { country?: string; region?: string } | null } = eval('require')('geoip-lite')

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
  let debugIp: string | null = null
  let debugLookup: unknown = null
  let debugError: string | null = null
  if (!region) {
    const ip = req.headers.get('cf-connecting-ip')
              || req.headers.get('x-real-ip')
              || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              || ''
    debugIp = ip
    if (ip) {
      try {
        const lookup = geoip.lookup(ip)
        debugLookup = lookup
        if (lookup?.region) {
          region = String(lookup.region).toUpperCase()
          source = 'geoip'
        }
      } catch (e) {
        debugError = e instanceof Error ? e.message : String(e)
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
    debug: { ip: debugIp, lookup: debugLookup, error: debugError, hasGeoipFn: typeof geoip?.lookup === 'function' },
  })
}
