import { NextRequest, NextResponse } from 'next/server'
import { findRegion } from '@/lib/us-sales-tax'

export const dynamic = 'force-dynamic'

/**
 * Detect the customer's tax region from Cloudflare-injected request headers.
 * - cf-ipcountry: ISO-3166 alpha-2 (e.g. "US", "GB", "AU")
 * - cf-region-code: ISO-3166-2 subdivision code (e.g. "TX", "ON", "NSW") on most plans since 2023
 *
 * Returns a region code that matches lib/us-sales-tax REGIONS so the deposit
 * page can pre-fill (and LOCK) the tax estimate. We never let the customer
 * lower the estimate by switching to a no-tax state — Pandabase computes the
 * real tax from their billing address regardless of what they pick here.
 */
export async function GET(req: NextRequest) {
  const country = (req.headers.get('cf-ipcountry') || '').toUpperCase()
  const region = (req.headers.get('cf-region-code') || req.headers.get('cf-region') || '').toUpperCase()

  let code: string | null = null
  if (country === 'US' && region) code = `US-${region}`
  else if (country === 'AU' && region) code = `AU-${region}`
  else if (country === 'CA' && region) code = `CA-${region}`
  else if (country === 'GB' || country === 'DE' || country === 'NZ' || country === 'RS') code = country

  // Confirm it's something our table actually knows; fall back to no-detection if not
  const found = code ? findRegion(code) : null

  return NextResponse.json({
    detected: !!found,
    regionCode: found?.code ?? null,
    label: found?.label ?? null,
    rate: found?.rate ?? null,
    raw: { country, region },
  })
}
