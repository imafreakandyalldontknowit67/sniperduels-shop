'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import posthog from 'posthog-js'
import {
  type CurrencyCode,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
  detectCurrencyFromLocale,
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

  // Load saved preference or detect from locale
  useEffect(() => {
    try {
      const saved = localStorage.getItem('preferred_currency')
      if (saved && saved in SUPPORTED_CURRENCIES) {
        setCurrencyState(saved as CurrencyCode)
      } else {
        const detected = detectCurrencyFromLocale(navigator.language)
        setCurrencyState(detected)
        if (detected !== 'USD') {
          posthog.capture('currency_auto_detected', { detected_currency: detected, browser_locale: navigator.language })
        }
      }
    } catch {
      // localStorage unavailable, keep USD
    }
    setInitialized(true)
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
