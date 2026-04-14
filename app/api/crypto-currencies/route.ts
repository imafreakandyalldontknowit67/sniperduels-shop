import { NextResponse } from 'next/server'

let cachedCurrencies: string[] | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  const now = Date.now()
  if (cachedCurrencies && now - cacheTime < CACHE_TTL) {
    return NextResponse.json(cachedCurrencies)
  }

  try {
    const res = await fetch('https://api.nowpayments.io/v1/currencies', {
      headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY || '' },
    })
    if (!res.ok) {
      return NextResponse.json(cachedCurrencies || [], { status: 502 })
    }
    const data = await res.json()
    // API returns { currencies: [...] } or just an array
    const list: string[] = Array.isArray(data) ? data : (data.currencies || [])
    cachedCurrencies = list.sort()
    cacheTime = now
    return NextResponse.json(cachedCurrencies)
  } catch {
    return NextResponse.json(cachedCurrencies || [], { status: 502 })
  }
}
