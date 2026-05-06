// Server-side FX conversion. Single source of truth for any code path that
// turns a user-entered local-currency amount into the USD value we credit
// to the wallet / quote NowPayments / charge Pandabase. Keeping this off the
// client means a stale localStorage rate or a misdetected `navigator.language`
// can't cause us to undercharge or overcharge an international customer.
//
// Cache TTL matches `app/api/exchange-rates/route.ts` (24h). Same upstream
// API. Same fallback. We just expose it as a function instead of an HTTP
// hop so server-to-server calls stay fast and don't go through the Next.js
// router again.

import { FALLBACK_RATES, SUPPORTED_CURRENCIES, type CurrencyCode } from './currency'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let cache: { rates: Record<string, number>; t: number } | null = null

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.result !== 'success' || !data.rates) return null
    return data.rates
  } catch {
    return null
  }
}

export async function getServerRates(): Promise<{ rates: Record<string, number>; source: 'live' | 'cached' | 'fallback' }> {
  const now = Date.now()
  if (cache && now - cache.t < CACHE_TTL_MS) {
    return { rates: cache.rates, source: 'cached' }
  }
  const live = await fetchLiveRates()
  if (live) {
    cache = { rates: live, t: now }
    console.log(`[fx] cache miss → fetched live rates n=${Object.keys(live).length}`)
    return { rates: live, source: 'live' }
  }
  console.error('[fx] live fetch failed → using FALLBACK_RATES')
  return { rates: FALLBACK_RATES, source: 'fallback' }
}

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code in SUPPORTED_CURRENCIES
}

export interface LocalToUsdResult {
  usdAmount: number
  rate: number
  source: 'live' | 'cached' | 'fallback'
}

// Convert a local-currency amount to USD using authoritative server rates.
// Mirrors `convertToUsd` in lib/currency.ts (ceils to favor the user so the
// wallet credit is never short of what the page displayed).
export async function localToUsd(amount: number, currency: string): Promise<LocalToUsdResult> {
  if (!isSupportedCurrency(currency)) {
    throw new Error(`Unsupported currency: ${currency}`)
  }
  if (currency === 'USD') {
    return { usdAmount: Math.round(amount * 100) / 100, rate: 1, source: 'live' }
  }
  const { rates, source } = await getServerRates()
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1
  const usdAmount = Math.ceil((amount / rate) * 100) / 100
  return { usdAmount, rate, source }
}

// Inverse: USD → local. Used for "minimum is X local" error messages.
export async function usdToLocal(usdAmount: number, currency: string): Promise<number> {
  if (!isSupportedCurrency(currency)) {
    throw new Error(`Unsupported currency: ${currency}`)
  }
  if (currency === 'USD') return usdAmount
  const { rates } = await getServerRates()
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1
  return Math.ceil(usdAmount * rate * 100) / 100
}
