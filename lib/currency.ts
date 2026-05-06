export const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  MXN: { symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  PHP: { symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
} as const

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES

// Approximate fallback rates (USD base) — used when exchange rate API is unavailable
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  BRL: 5.05,
  MXN: 17.15,
  JPY: 149.50,
  INR: 83.40,
  PHP: 56.20,
}

const LOCALE_TO_CURRENCY: Record<string, CurrencyCode> = {
  'en-GB': 'GBP',
  'en-AU': 'AUD',
  'en-CA': 'CAD',
  'en-IN': 'INR',
  'en-PH': 'PHP',
  'pt-BR': 'BRL',
  'es-MX': 'MXN',
  'ja': 'JPY',
  'ja-JP': 'JPY',
  'hi': 'INR',
  'hi-IN': 'INR',
  'fr-FR': 'EUR',
  'de-DE': 'EUR',
  'de-AT': 'EUR',
  'es-ES': 'EUR',
  'it-IT': 'EUR',
  'nl-NL': 'EUR',
  'pt-PT': 'EUR',
  'fi-FI': 'EUR',
  'el-GR': 'EUR',
  'fr-BE': 'EUR',
  'nl-BE': 'EUR',
  'de-LU': 'EUR',
  'fr-LU': 'EUR',
  'ga-IE': 'EUR',
  'en-IE': 'EUR',
  'et-EE': 'EUR',
  'lv-LV': 'EUR',
  'lt-LT': 'EUR',
  'sk-SK': 'EUR',
  'sl-SI': 'EUR',
  'mt-MT': 'EUR',
  'fil': 'PHP',
  'fil-PH': 'PHP',
}

export function detectCurrencyFromLocale(locale: string): CurrencyCode {
  // Try exact match first (e.g. "en-GB")
  if (locale in LOCALE_TO_CURRENCY) {
    return LOCALE_TO_CURRENCY[locale]
  }
  // Try language-only match (e.g. "ja" from "ja-JP")
  const lang = locale.split('-')[0]
  if (lang in LOCALE_TO_CURRENCY) {
    return LOCALE_TO_CURRENCY[lang]
  }
  return 'USD'
}

// ISO country code → preferred currency. Used when geo lookup tells us the
// user is in CA but `navigator.language` says en-US (common on Canadian
// Windows installs). Geo wins because it's authoritative.
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'AUD',
  BR: 'BRL', MX: 'MXN', JP: 'JPY', IN: 'INR', PH: 'PHP',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR',
  IE: 'EUR', PT: 'EUR', AT: 'EUR', BE: 'EUR', LU: 'EUR',
  FI: 'EUR', GR: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR',
  SK: 'EUR', SI: 'EUR', MT: 'EUR', CY: 'EUR',
}

export function detectCurrencyFromCountry(countryCode: string): CurrencyCode | null {
  const upper = countryCode.toUpperCase()
  return COUNTRY_TO_CURRENCY[upper] ?? null
}

export function formatPrice(
  usdAmount: number,
  currencyCode: CurrencyCode,
  rates: Record<string, number>
): string {
  if (currencyCode === 'USD') {
    return `$${usdAmount.toFixed(2)}`
  }

  const rate = rates[currencyCode] ?? FALLBACK_RATES[currencyCode] ?? 1
  const converted = usdAmount * rate

  // Prefix with the explicit symbol from SUPPORTED_CURRENCIES (e.g. "MX$",
  // "CA$", "A$", "R$") instead of letting Intl.NumberFormat use the locale's
  // default — Intl renders MXN/CAD/AUD/BRL as bare "$" in their native locales,
  // which a customer reading the page can't tell apart from USD. A Mexican
  // customer was seeing 10K gems for "$521.69" (52 pesos × 10) thinking they
  // were being charged USD.
  const { symbol, locale } = SUPPORTED_CURRENCIES[currencyCode]
  const digits = currencyCode === 'JPY' ? 0 : 2
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(converted)
  return `${symbol}${formatted}`
}

export function convertToUsd(
  localAmount: number,
  currencyCode: CurrencyCode,
  rates: Record<string, number>
): number {
  if (currencyCode === 'USD') return localAmount
  const rate = rates[currencyCode] ?? FALLBACK_RATES[currencyCode] ?? 1
  // Ceil so the user always gets at least the USD amount the page displayed —
  // round-trip via convertFromUsd would otherwise lose a sub-cent and short the wallet.
  return Math.ceil((localAmount / rate) * 100) / 100
}

export function convertFromUsd(
  usdAmount: number,
  currencyCode: CurrencyCode,
  rates: Record<string, number>
): number {
  if (currencyCode === 'USD') return usdAmount
  const rate = rates[currencyCode] ?? FALLBACK_RATES[currencyCode] ?? 1
  return Math.round(usdAmount * rate * 100) / 100
}

export function formatPricePerK(
  usdPerK: number,
  currencyCode: CurrencyCode,
  rates: Record<string, number>
): string {
  return `${formatPrice(usdPerK, currencyCode, rates)}/k`
}
