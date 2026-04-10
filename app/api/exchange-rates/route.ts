import { NextResponse } from 'next/server'
import { FALLBACK_RATES } from '@/lib/currency'

let cachedRates: Record<string, number> | null = null
let cachedAt = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function GET() {
  const now = Date.now()

  if (cachedRates && now - cachedAt < CACHE_TTL) {
    return NextResponse.json(
      { base: 'USD', rates: cachedRates, updatedAt: new Date(cachedAt).toISOString(), cached: true },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
    )
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 86400 },
    })

    if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`)

    const data = await res.json()
    if (data.result !== 'success' || !data.rates) throw new Error('Invalid API response')

    cachedRates = data.rates
    cachedAt = now

    return NextResponse.json(
      { base: 'USD', rates: cachedRates, updatedAt: new Date(cachedAt).toISOString(), cached: false },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
    )
  } catch (err) {
    console.error('Exchange rate fetch failed, using fallback rates:', err)

    // Return cached rates if we have any, otherwise fallback
    const rates = cachedRates ?? FALLBACK_RATES

    return NextResponse.json(
      { base: 'USD', rates, updatedAt: cachedAt ? new Date(cachedAt).toISOString() : null, fallback: true },
      { headers: { 'Cache-Control': 'public, max-age=300' } }
    )
  }
}
