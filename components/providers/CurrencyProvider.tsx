'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import posthog from 'posthog-js'
import {
  type CurrencyCode,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
  detectCurrencyFromLocale,
  detectCurrencyFromCountry,
  formatPrice as formatPriceUtil,
  formatPricePerK as formatPricePerKUtil,
  convertToUsd as convertToUsdUtil,
  convertFromUsd as convertFromUsdUtil,
} from '@/lib/currency'

interface CurrencyContextValue {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => void
  formatPrice: (usdAmount: number) => string
  formatPricePerK: (usdPerK: number) => string
  convertToUsd: (localAmount: number) => number
  convertFromUsd: (usdAmount: number) => number
  currencySymbol: string
  isUsd: boolean
  currencyLabel: string
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  setCurrency: () => {},
  formatPrice: (n) => `$${n.toFixed(2)}`,
  formatPricePerK: (n) => `$${n.toFixed(2)}/k`,
  convertToUsd: (n) => n,
  convertFromUsd: (n) => n,
  currencySymbol: '$',
  isUsd: true,
  currencyLabel: 'USD',
})

export function useCurrency() {
  return useContext(CurrencyContext)
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD')
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES)
  const [initialized, setInitialized] = useState(false)

  // Load saved preference, then detect from server-side geo (authoritative),
  // fall back to navigator.language. Geo wins because Canadian Windows often
  // reports en-US even though the IP is clearly in Canada — that
  // misclassification is exactly what stranded mel41798's deposit.
  useEffect(() => {
    let cancelled = false
    try {
      const saved = localStorage.getItem('preferred_currency')
      if (saved && saved in SUPPORTED_CURRENCIES) {
        setCurrencyState(saved as CurrencyCode)
        setInitialized(true)
        return
      }
    } catch {
      // localStorage unavailable — continue to detection
    }

    // Provisional detection from locale so the page doesn't paint USD
    // first then flicker. Geo result overrides if it disagrees.
    const localeGuess = (() => {
      try { return detectCurrencyFromLocale(navigator.language) } catch { return 'USD' as CurrencyCode }
    })()
    setCurrencyState(localeGuess)

    fetch('/api/geo')
      .then(res => res.json())
      .then((data: { raw?: { country?: string } }) => {
        if (cancelled) return
        const country = data?.raw?.country || ''
        const fromGeo = country ? detectCurrencyFromCountry(country) : null
        if (fromGeo && fromGeo !== localeGuess) {
          setCurrencyState(fromGeo)
          posthog.capture('currency_auto_detected', { detected_currency: fromGeo, source: 'geo', country, browser_locale: navigator.language })
        } else if (localeGuess !== 'USD') {
          posthog.capture('currency_auto_detected', { detected_currency: localeGuess, source: 'locale', browser_locale: navigator.language })
        }
      })
      .catch(() => {
        // Geo lookup failed — locale guess is the best we can do
      })
      .finally(() => {
        if (!cancelled) setInitialized(true)
      })

    return () => { cancelled = true }
  }, [])

  // Fetch exchange rates
  useEffect(() => {
    let cancelled = false
    fetch('/api/exchange-rates')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.rates) {
          setRates(data.rates)
        }
      })
      .catch(() => {
        // Keep fallback rates
      })
    return () => { cancelled = true }
  }, [])

  const setCurrency = useCallback((code: CurrencyCode) => {
    const prev = currency
    setCurrencyState(code)
    try {
      localStorage.setItem('preferred_currency', code)
    } catch {
      // localStorage unavailable
    }
    if (prev !== code) {
      posthog.capture('currency_changed', { from: prev, to: code })
    }
  }, [currency])

  const formatPrice = useCallback(
    (usdAmount: number) => formatPriceUtil(usdAmount, currency, rates),
    [currency, rates]
  )

  const formatPricePerK = useCallback(
    (usdPerK: number) => formatPricePerKUtil(usdPerK, currency, rates),
    [currency, rates]
  )

  const convertToUsd = useCallback(
    (localAmount: number) => convertToUsdUtil(localAmount, currency, rates),
    [currency, rates]
  )

  const convertFromUsd = useCallback(
    (usdAmount: number) => convertFromUsdUtil(usdAmount, currency, rates),
    [currency, rates]
  )

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    formatPrice,
    formatPricePerK,
    convertToUsd,
    convertFromUsd,
    currencySymbol: SUPPORTED_CURRENCIES[currency].symbol,
    isUsd: currency === 'USD',
    currencyLabel: SUPPORTED_CURRENCIES[currency].name,
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}
