'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { useAuth, useCurrency } from '@/components/providers'
import type { Deposit } from '@/lib/storage'

const PRESET_AMOUNTS = [5, 10, 25, 50, 100]
const POPULAR_CURRENCIES = ['btc', 'eth', 'sol', 'usdtsol', 'usdcsol', 'ltc']

const CURRENCY_NAMES: Record<string, string> = {
  btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana', usdt: 'Tether', usdc: 'USD Coin',
  usdtsol: 'USDT (Solana)', usdcsol: 'USDC (Solana)', usdterc20: 'USDT (ERC-20)', usdcerc20: 'USDC (ERC-20)',
  ltc: 'Litecoin', xrp: 'Ripple', doge: 'Dogecoin', ada: 'Cardano', bnbbsc: 'BNB',
  matic: 'Polygon', avax: 'Avalanche', trx: 'TRON', dot: 'Polkadot', shib: 'Shiba Inu',
  link: 'Chainlink', uni: 'Uniswap', ton: 'Toncoin', near: 'NEAR', apt: 'Aptos', xmr: 'Monero',
  bch: 'Bitcoin Cash', dash: 'Dash', xlm: 'Stellar', atom: 'Cosmos', algo: 'Algorand',
}

// Map NOWPayments currency IDs to standard ticker symbols for LogoKit
const TICKER_MAP: Record<string, string> = {
  usdtsol: 'usdt', usdcsol: 'usdc', usdterc20: 'usdt', usdcerc20: 'usdc',
  bnbbsc: 'bnb', maticpolygon: 'matic',
}

function getCryptoIcon(id: string): string {
  const ticker = TICKER_MAP[id] || id
  return `https://img.logokit.com/crypto/${ticker.toUpperCase()}?token=pk_frc96be2c501230ad20f49&size=64`
}

type Tab = 'card' | 'crypto'

type BillingForm = {
  name: string
  email: string
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
}

type CardEstimate = {
  walletCredit: number
  walletCreditCents: number
  subtotal: number
  subtotalCents: number
  processingRecovery: number
  tax: number
  taxCents: number
  taxRate: number
  total: number
  totalCents: number
  cryptoSavings: number
  cryptoSavingsCents: number
  availablePaymentMethods: string[]
}

const EMPTY_BILLING: BillingForm = {
  name: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'BR', label: 'Brazil' },
  { code: 'IN', label: 'India' },
]

export default function DepositPage() {
  const searchParams = useSearchParams()
  const { user, isLoading, walletBalance: authWalletBalance } = useAuth()
  const { formatPrice, isUsd, currency, currencySymbol, convertToUsd, convertFromUsd } = useCurrency()
  const [tab, setTab] = useState<Tab>('crypto')
  const [amount, setAmount] = useState(() => {
    const prefill = searchParams.get('amount')
    return prefill && !isNaN(Number(prefill)) ? prefill : ''
  })
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hpField, setHpField] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [botOnline, setBotOnline] = useState(true)
  const [billing, setBilling] = useState<BillingForm>(EMPTY_BILLING)
  const [cardEstimate, setCardEstimate] = useState<CardEstimate | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [billingTouched, setBillingTouched] = useState(false)

  // Mobile keyboard / viewport detection. Only emit analytics when the
  // keyboard obscures an input; never force-scroll the focused field because
  // that fights the user's manual scrolling in the billing calculator.
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const keyboardObscuredFiredRef = useRef(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const vv = (window as Window & { visualViewport?: VisualViewport }).visualViewport
    if (!vv) return
    function handleResize() {
      const active = document.activeElement as HTMLElement | null
      if (!active) return
      const tag = active.tagName.toLowerCase()
      if (tag !== 'input' && tag !== 'textarea') return
      const rect = active.getBoundingClientRect()
      const visualBottom = (vv?.height ?? window.innerHeight) + (vv?.offsetTop ?? 0)
      const obscured = rect.bottom > visualBottom - 8
      if (obscured) {
        if (!keyboardObscuredFiredRef.current) {
          keyboardObscuredFiredRef.current = true
          posthog.capture('mobile_deposit_keyboard_obscured', {
            input_name: active.getAttribute('name') || active.id || 'unknown',
            visual_height: Math.round(vv?.height ?? 0),
            input_bottom: Math.round(rect.bottom),
          })
        }
      }
    }
    vv.addEventListener('resize', handleResize)
    return () => {
      vv.removeEventListener('resize', handleResize)
    }
  }, [])

  // Crypto-specific state
  const [allCurrencies, setAllCurrencies] = useState<string[]>([])
  const [cryptoSearch, setCryptoSearch] = useState('')
  const [showCryptoDropdown, setShowCryptoDropdown] = useState(false)
  const [cryptoCurrency, setCryptoCurrency] = useState('btc')
  const [cryptoPayment, setCryptoPayment] = useState<{
    depositId: string
    payAddress: string
    payAmount: number
    payCurrency: string
    bonusAmount: number
  } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isLoading) {
      setWalletBalance(authWalletBalance)
      if (user) {
        fetchDeposits()
        fetchCurrencies()
        fetch('/api/bot/status')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && typeof data.online === 'boolean') setBotOnline(data.online)
          })
          .catch(() => {})
      }
    }
  }, [isLoading, user, authWalletBalance])

  async function fetchCurrencies() {
    try {
      const res = await fetch('/api/crypto-currencies')
      if (res.ok) setAllCurrencies(await res.json())
    } catch { /* fallback to popular only */ }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])


  async function fetchDeposits() {
    try {
      const res = await fetch('/api/deposits')
      if (res.ok) setDeposits(await res.json())
    } catch { /* silently fail */ }
  }

  useEffect(() => {
    if (!isLoading && user) {
      posthog.capture('deposit_page_viewed', { wallet_balance: authWalletBalance })
    }
  }, [isLoading, user])

  useEffect(() => {
    setCardEstimate(null)
  }, [amount, currency, billing.name, billing.email, billing.line1, billing.line2, billing.city, billing.state, billing.postal_code, billing.country])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Convert input amount (in user's currency) to USD
  function getUsdAmount(): number {
    const numAmount = parseFloat(amount)
    if (!numAmount) return 0
    return isUsd ? numAmount : convertToUsd(numAmount)
  }

  // Get min in user's currency
  const minLocal = isUsd ? 5 : convertFromUsd(5)

  function updateBilling<K extends keyof BillingForm>(key: K, value: BillingForm[K]) {
    setBillingTouched(true)
    setBilling(prev => ({
      ...prev,
      [key]: (key === 'country' || key === 'state' ? String(value).toUpperCase() : value) as BillingForm[K],
      ...(key === 'country' && value !== 'US' ? { state: prev.state } : {}),
    }))
  }

  function billingReady(): boolean {
    return !!(
      billing.name.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email.trim()) &&
      billing.line1.trim() &&
      billing.city.trim() &&
      billing.state.trim() &&
      billing.postal_code.trim() &&
      /^[A-Z]{2}$/.test(billing.country.trim().toUpperCase())
    )
  }

  async function handleEstimateCardTotal() {
    const numAmount = parseFloat(amount)
    const usdAmount = getUsdAmount()
    if (!usdAmount || usdAmount < 5) {
      setMessage({ type: 'error', text: `Amount must be at least ${currencySymbol}${Math.ceil(minLocal)}` })
      return
    }
    if (!billingReady()) {
      setMessage({ type: 'error', text: 'Fill out your billing address so we can calculate the card total.' })
      return
    }
    setEstimateLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/deposits/estimate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, localCurrency: currency, billing, website: hpField }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to estimate card total' })
        return
      }
      setCardEstimate(data)
      posthog.capture('deposit_card_estimated', {
        provider: 'pandabase',
        amount_usd: data.walletCredit,
        charge_amount: data.subtotal,
        estimated_tax: data.tax,
        estimated_total: data.total,
        crypto_savings: data.cryptoSavings,
        billing_country: billing.country,
        billing_state: billing.state,
      })
    } catch {
      setMessage({ type: 'error', text: 'Failed to estimate card total' })
    } finally {
      setEstimateLoading(false)
    }
  }

  // ── Card/CashApp deposit (Pandabase) ──
  async function handleCardDeposit() {
    const numAmount = parseFloat(amount)
    const usdAmount = getUsdAmount()
    if (!usdAmount || usdAmount < 5) {
      setMessage({ type: 'error', text: `Amount must be at least ${currencySymbol}${Math.ceil(minLocal)}` })
      return
    }
    if (!user) {
      setMessage({ type: 'error', text: 'Preview mode: card total estimation is enabled, but creating a real checkout still requires login.' })
      return
    }
    if (!billingReady()) {
      setMessage({ type: 'error', text: 'Fill out your billing address before continuing with card.' })
      return
    }
    if (!cardEstimate) {
      await handleEstimateCardTotal()
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/deposits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the user's local-currency input; server converts to USD authoritatively.
        body: JSON.stringify({ amount: numAmount, localCurrency: currency, billing, website: hpField }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Failed to create deposit' }); return }

      // method='pending' because the Pandabase sheet hasn't asked the user to pick yet —
      // the real method (card / apple_pay / google_pay / cashapp / etc) is captured by
      // the server webhook on deposit_completed/failed using `final_method`.
      posthog.capture('deposit_initiated', {
        provider: 'pandabase',
        method: 'pending',
        amount: usdAmount,
        amount_usd: usdAmount,
        currency: currency || 'USD',
        local_amount: numAmount,
        local_currency: currency,
        intent_id: data.depositId,
        deposit_id: data.depositId,
        invoice_id: data.sessionId,
        charge_amount: data.chargeAmount,
        processing_fee: data.processingFee,
        estimated_tax: cardEstimate.tax,
        estimated_total: cardEstimate.total,
        crypto_savings: cardEstimate.cryptoSavings,
        billing_country: billing.country,
        billing_state: billing.state,
        source: 'client',
      })

      const win = window as unknown as { Pandabase?: { checkout: (opts: Record<string, unknown>) => { open: () => void; destroy: () => void } } }
      if (win.Pandabase && data.sessionId) {
        const checkout = win.Pandabase.checkout({
          storeId: 'shp_szumqvgl22fkw6m5030elu6dgi',
          sessionId: data.sessionId,
          mode: 'modal',
          theme: 'dark',
          // Pandabase passes a `detail` object on these callbacks containing the
          // resolved payment_method_type (apple_pay/google_pay/card). We capture
          // it here as a hint, but the webhook is authoritative — server fires
          // deposit_completed/failed with full brand/country/decline_code.
          onPaymentMethodSelected: (detail: { type?: string; brand?: string } = {}) => {
            posthog.capture('deposit_method_selected', {
              provider: 'pandabase',
              method: detail?.type || 'unknown',
              card_brand: detail?.brand,
              amount_usd: usdAmount,
              intent_id: data.depositId,
              deposit_id: data.depositId,
            })
          },
          onPaymentMethodChanged: (detail: { from?: string; to?: string } = {}) => {
            posthog.capture('deposit_method_changed', {
              provider: 'pandabase',
              from_method: detail?.from,
              to_method: detail?.to,
              amount_usd: usdAmount,
              intent_id: data.depositId,
              deposit_id: data.depositId,
            })
          },
          onPaymentSuccess: (detail: { type?: string; brand?: string; country?: string } = {}) => {
            // Optional client-side hint event — the webhook fires deposit_completed
            // server-side with full data. This is here so we still see SOMETHING
            // in the funnel within milliseconds of success (webhook can lag 1-3s).
            posthog.capture('deposit_completed_client', {
              provider: 'pandabase',
              method: detail?.type || 'card',
              card_brand: detail?.brand,
              card_country: detail?.country,
              amount: usdAmount,
              amount_usd: usdAmount,
              intent_id: data.depositId,
              deposit_id: data.depositId,
            })
            setMessage({ type: 'success', text: `${formatPrice(usdAmount)} payment received! Crediting your wallet...` })
            setAmount('')
            setCardEstimate(null)
            setTimeout(() => { handleVerify(data.depositId); fetchDeposits() }, 2000)
            checkout.destroy()
          },
          onPaymentFailed: (detail: { type?: string; decline_code?: string; code?: string; message?: string } = {}) => {
            posthog.capture('deposit_failed', {
              provider: 'pandabase',
              method: detail?.type || 'unknown',
              payment_method_type: detail?.type || 'unknown',
              decline_code: detail?.decline_code || detail?.code || 'payment_failed',
              error_message: typeof detail?.message === 'string' ? detail.message.slice(0, 200) : undefined,
              amount: usdAmount,
              amount_usd: usdAmount,
              intent_id: data.depositId,
              deposit_id: data.depositId,
              source: 'client',
            })
            setMessage({ type: 'error', text: 'Payment failed. Please try again.' })
            checkout.destroy()
          },
          onClose: () => { posthog.capture('deposit_checkout_closed', { provider: 'pandabase', amount: usdAmount, intent_id: data.depositId }); fetchDeposits() },
        })
        checkout.open()
        posthog.capture('checkout_modal_opened', { provider: 'pandabase', amount_usd: usdAmount, intent_id: data.depositId })
      } else {
        window.open(data.checkoutUrl, '_blank')
        setMessage({ type: 'success', text: 'Checkout opened. Complete payment then verify below.' })
      }
      setAmount('')
      setCardEstimate(null)
      fetchDeposits()
    } catch { setMessage({ type: 'error', text: 'Something went wrong' }) }
    finally { setLoading(false) }
  }

  // ── Crypto deposit (NearPayments) ──
  async function handleCryptoDeposit() {
    const numAmount = parseFloat(amount)
    const usdAmount = getUsdAmount()
    if (!usdAmount || usdAmount < 5) {
      setMessage({ type: 'error', text: `Amount must be at least ${currencySymbol}${Math.ceil(minLocal)}` })
      return
    }
    setLoading(true)
    setMessage(null)
    setCryptoPayment(null)
    try {
      const res = await fetch('/api/deposits/create-crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the user's local-currency input; server converts to USD authoritatively.
        body: JSON.stringify({ amount: numAmount, localCurrency: currency, currency: cryptoCurrency, website: hpField }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Failed to create crypto deposit' }); return }

      posthog.capture('deposit_initiated', {
        provider: 'nowpayments',
        method: 'crypto',
        final_method: `crypto_${cryptoCurrency.toLowerCase()}`,
        currency: cryptoCurrency,
        local_currency: currency,
        amount: usdAmount,
        amount_usd: usdAmount,
        local_amount: numAmount,
        intent_id: data.depositId,
        deposit_id: data.depositId,
        payment_id: data.paymentId,
        source: 'client',
      })
      // crypto_address_generated is also fired server-side from the create-crypto
      // route (with full payment_id + expected_amount). The client copy gives us
      // a faster view into "users who saw the QR" funnel.
      posthog.capture('crypto_address_generated', {
        provider: 'nowpayments',
        currency: data.payCurrency || cryptoCurrency,
        final_method: `crypto_${(data.payCurrency || cryptoCurrency).toLowerCase()}`,
        expected_amount: data.payAmount,
        amount_usd: usdAmount,
        intent_id: data.depositId,
        deposit_id: data.depositId,
        payment_id: data.paymentId,
        source: 'client',
      })
      setCryptoPayment(data)

      // Poll for completion every 5s
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        const verifyRes = await fetch('/api/deposits/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depositId: data.depositId }),
        })
        const verifyData = await verifyRes.json()
        if (verifyData.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current)
          // Client-side hint — the webhook fires deposit_completed server-side
          // with provider/currency/amount_received/tx_hash. Keep this as a
          // distinct event name so we don't double-count in the funnel.
          posthog.capture('deposit_completed_client', {
            provider: 'nowpayments',
            method: 'crypto',
            final_method: `crypto_${cryptoCurrency.toLowerCase()}`,
            currency: cryptoCurrency,
            amount: verifyData.amount || 0,
            amount_usd: verifyData.amount || 0,
            intent_id: data.depositId,
            deposit_id: data.depositId,
            source: 'verify_poll',
          })
          setWalletBalance(verifyData.walletBalance)
          setMessage({ type: 'success', text: verifyData.message })
          setCryptoPayment(null)
          setAmount('')
          fetchDeposits()
          // If the deposit was kicked off from a buy intent (B2), bounce back
          // to /gems so the resume flow can hydrate state and re-open the
          // confirm modal with the now-sufficient balance. Short delay so the
          // user sees the success message before the redirect.
          const intentId = searchParams.get('intentId')
          if (intentId) {
            setTimeout(() => {
              window.location.href = `/gems?resumeBuy=${encodeURIComponent(intentId)}`
            }, 1500)
          }
        } else if (verifyData.status === 'failed' || verifyData.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current)
          posthog.capture('deposit_failed', {
            provider: 'nowpayments',
            method: 'crypto',
            payment_method_type: 'crypto',
            currency: cryptoCurrency,
            decline_code: verifyData.status, // expired | failed
            reason: verifyData.status,
            amount_usd: usdAmount,
            intent_id: data.depositId,
            deposit_id: data.depositId,
            source: 'client',
          })
          if (verifyData.status === 'expired') {
            posthog.capture('crypto_payment_expired', {
              provider: 'nowpayments',
              currency: cryptoCurrency,
              amount_usd: usdAmount,
              intent_id: data.depositId,
              deposit_id: data.depositId,
            })
          }
          setMessage({ type: 'error', text: `Deposit ${verifyData.status}` })
          setCryptoPayment(null)
        }
      }, 5000)
    } catch { setMessage({ type: 'error', text: 'Something went wrong' }) }
    finally { setLoading(false) }
  }

  async function handleVerify(depositId: string) {
    setVerifyingId(depositId)
    setMessage(null)
    try {
      const res = await fetch('/api/deposits/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId }),
      })
      const data = await res.json()
      if (data.status === 'completed') {
        // Client hint — server webhook fires the canonical deposit_completed
        // with provider/final_method/brand/country/3DS/processing_time_ms.
        posthog.capture('deposit_completed_client', {
          provider: 'pandabase',
          amount: data.amount || 0,
          amount_usd: data.amount || 0,
          intent_id: depositId,
          deposit_id: depositId,
          source: 'manual_verify',
        })
        setWalletBalance(data.walletBalance)
        setMessage({ type: 'success', text: data.message })
        fetchDeposits()
        // B2: bounce back to /gems if a buy intent was attached.
        const intentId = searchParams.get('intentId')
        if (intentId) {
          setTimeout(() => {
            window.location.href = `/gems?resumeBuy=${encodeURIComponent(intentId)}`
          }, 1500)
        }
      } else if (data.error) {
        setMessage({ type: 'error', text: data.error })
      } else {
        setMessage({ type: 'error', text: data.message || 'Payment not yet completed.' })
      }
    } catch { setMessage({ type: 'error', text: 'Failed to verify' }) }
    finally { setVerifyingId(null) }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied!' })
    setTimeout(() => setMessage(null), 1500)
  }

  async function handleCancelDeposit(depositId: string) {
    setCancellingId(depositId)
    try {
      const res = await fetch(`/api/deposits/${depositId}/cancel-deposit`, { method: 'POST' })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Deposit cancelled' })
        fetchDeposits()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to cancel' })
      }
    } catch { setMessage({ type: 'error', text: 'Failed to cancel' }) }
    finally { setCancellingId(null) }
  }

  const pendingDeposits = deposits.filter(d => d.status === 'pending')
  const completedDeposits = deposits.filter(d => d.status !== 'pending')

  return (
    <div className="flex flex-col items-center min-h-[100dvh] md:min-h-0 px-3 md:px-0 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-xl mb-8">
        <h1 className="text-2xl font-bold text-white text-center">Add Balance</h1>
        <p className="text-gray-400 mt-1 text-center">
          Current balance: <span className="text-white font-medium">{formatPrice(walletBalance)}</span>
        </p>
        {!botOnline && (
          <div className="mt-4 p-3 rounded-lg text-center" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
            <p className="text-yellow-400 text-xs">
              The trade bot is offline. You can still deposit, but purchases won&apos;t go through until it&apos;s back.{' '}
              <a href="https://discord.gg/sniperduels" target="_blank" rel="noopener noreferrer" className="underline">Join Discord for updates</a>.
            </p>
          </div>
        )}
      </div>

      <div className="w-full max-w-xl">
        {message && (
          <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            <p className="text-sm text-center">{message.text}</p>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex gap-3 mb-6 justify-center">
          <button
            onClick={() => { setTab('card'); setCryptoPayment(null); if (pollRef.current) clearInterval(pollRef.current) }}
            className="relative inline-flex items-center justify-center pixel-btn-press"
          >
            <img src="/images/pixel/pngs/asset-60.png" alt="" className="h-[42px] sm:h-[46px] w-auto" style={{ imageRendering: 'pixelated', filter: tab === 'card' ? 'none' : 'brightness(0.5)' }} />
            <span className={`absolute inset-0 flex items-center justify-center font-bold text-xs sm:text-sm uppercase tracking-wider ${tab === 'card' ? 'text-white' : 'text-gray-500'}`}>
              Pay Online
            </span>
          </button>
          <button
            onClick={() => setTab('crypto')}
            className="relative inline-flex items-center justify-center pixel-btn-press"
          >
            <img src="/images/pixel/pngs/asset-60.png" alt="" className="h-[42px] sm:h-[46px] w-auto" style={{ imageRendering: 'pixelated', filter: tab === 'crypto' ? 'none' : 'brightness(0.5)' }} />
            <span className={`absolute inset-0 flex items-center justify-center font-bold text-xs sm:text-sm uppercase tracking-wider ${tab === 'crypto' ? 'text-white' : 'text-gray-500'}`}>
              Use Crypto
            </span>
          </button>
        </div>

        {/* Amount Input (shared) */}
        <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
          <label className="block text-sm text-gray-400 mb-3 text-center">
            Deposit amount {!isUsd && `(${currency})`}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">{currencySymbol}</span>
            <input
              ref={amountInputRef}
              type="number"
              inputMode="decimal"
              autoComplete="off"
              name="deposit-amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min={Math.ceil(minLocal)}
              step="0.01"
              className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-4 pl-14 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="flex gap-2 mt-4 justify-center flex-wrap">
            {PRESET_AMOUNTS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p.toString())}
                className="relative inline-flex items-center justify-center pixel-btn-press"
              >
                <img src="/images/pixel/pngs/asset-62.png" alt="" className="h-[34px] sm:h-[38px] w-auto" style={{ imageRendering: 'pixelated', filter: amount === p.toString() ? 'none' : 'brightness(0.55)' }} />
                <span className={`absolute inset-0 flex items-center justify-center font-bold text-[10px] sm:text-xs uppercase tracking-wider ${amount === p.toString() ? 'text-white' : 'text-gray-400'}`}>
                  {currencySymbol}{p}
                </span>
              </button>
            ))}
          </div>
          {!isUsd && amount && parseFloat(amount) > 0 && (
            <p className="text-xs text-center mt-3 text-accent">
              {currencySymbol}{parseFloat(amount).toFixed(2)} {currency} = ${getUsdAmount().toFixed(2)} USD
            </p>
          )}
          {tab === 'crypto' && (
            <p className="text-xs text-center mt-3 text-gray-400">
              Crypto deposits are 1:1 with no processing recovery.
            </p>
          )}
          {tab === 'card' && amount && getUsdAmount() >= 5 && (
            <p className="text-xs text-center mt-3 text-gray-400">
              Fill billing details below to calculate the exact PandaBase-estimated card total.
            </p>
          )}
        </div>

        {/* Payment Info Section (card tab) */}
        {tab === 'card' && (
          <div className="mb-6 py-5 text-center">
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.15em] uppercase text-gray-400 mb-3">
              Online Payment Powered by Pandabase
            </p>
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              {[
                { name: 'Card', src: '/images/payment/visa.svg' },
                { name: 'Apple Pay', src: '/images/payment/applepay.svg' },
                { name: 'Google Pay', src: '/images/payment/googlepay.svg' },
                { name: 'Cash App', src: '/images/payment/cashapp.svg' },
              ].map((pm) => (
                <div key={pm.name} className="w-[48px] h-[30px] sm:w-[56px] sm:h-[34px] flex items-center justify-center rounded border border-dark-500 bg-white/5 p-1.5">
                  <img src={pm.src} alt={pm.name} className="max-w-full max-h-full object-contain" />
                </div>
              ))}
            </div>
            <div className="relative inline-block group">
              <p className="text-[8px] sm:text-[9px] font-semibold tracking-[0.12em] uppercase text-gray-500 cursor-default inline-flex items-center gap-1">
                And 15+ Regional Payment Methods
                <svg className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </p>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] sm:w-[340px] p-3 rounded-lg border border-dark-500 bg-dark-900/95 backdrop-blur-sm shadow-xl shadow-black/40 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-20">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-dark-900/95 border-r border-b border-dark-500" />
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {[
                    { name: 'Visa', src: '/images/payment/visa.svg' },
                    { name: 'Mastercard', src: '/images/payment/mastercard.svg' },
                    { name: 'PIX', src: '/images/payment/pix.svg' },
                    { name: 'iDEAL', src: '/images/payment/ideal.svg' },
                    { name: 'SEPA', src: '/images/payment/sepa.svg' },
                    { name: 'Bancontact', src: '/images/payment/bancontact.svg' },
                    { name: 'Multibanco', src: '/images/payment/multibanco.svg' },
                    { name: 'MB Way', src: '/images/payment/mbway.svg' },
                    { name: 'EPS', src: '/images/payment/eps.svg' },
                    { name: 'P24', src: '/images/payment/przelewy24.svg' },
                    { name: 'Alipay', src: '/images/payment/alipay.svg' },
                    { name: 'WeChat', src: '/images/payment/wechatpay.svg' },
                    { name: 'Samsung', src: '/images/payment/samsungpay.svg' },
                    { name: 'UPI', src: '/images/payment/upi.svg' },
                    { name: 'Naver', src: '/images/payment/naverpay.svg' },
                    { name: 'Kakao', src: '/images/payment/kakaopay.svg' },
                  ].map((pm) => (
                    <div key={pm.name} className="flex flex-col items-center gap-0.5">
                      <div className="w-[28px] h-[18px] flex items-center justify-center">
                        <img src={pm.src} alt={pm.name} className="max-w-full max-h-full object-contain" style={{ filter: 'brightness(1.1)' }} />
                      </div>
                      <span className="text-[5px] uppercase tracking-wider text-gray-600">{pm.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Info Section (crypto tab) */}
        {tab === 'crypto' && !cryptoPayment && (
          <div className="mb-6 py-5 text-center">
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.15em] uppercase text-gray-400 mb-3">
              Crypto Payment via NOWPayments
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3">
              {['btc', 'eth', 'sol', 'usdt', 'usdc', 'ltc'].map((coin) => (
                <div key={coin} className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] flex items-center justify-center rounded-full border border-dark-500 bg-white/5 p-1.5">
                  <img src={getCryptoIcon(coin)} alt={coin} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
            <p className="text-[8px] sm:text-[9px] font-semibold tracking-[0.12em] uppercase text-gray-500">
              And 100+ Supported Cryptocurrencies
            </p>
          </div>
        )}

        <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#e1ad2d] shrink-0"
          />
          <span className="text-[10px] text-gray-400 leading-tight">
            I agree that{' '}
            <a href="/terms" className="text-[#e1ad2d] hover:underline" target="_blank">all sales are final</a>
            {' '}and non-refundable. Deposits are credited to your wallet and cannot be reversed. Filing a dispute or chargeback will result in a permanent ban. Issues?{' '}
            <a href="https://discord.gg/sniperduels" className="text-[#e1ad2d] hover:underline" target="_blank" rel="noopener noreferrer">Open a ticket in our Discord</a>.
          </span>
        </label>

        {/* Card Tab Content */}
        {tab === 'card' && (
          <>
            <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
              <input type="text" name="website" value={hpField} onChange={(e) => setHpField(e.target.value)} autoComplete="off" tabIndex={-1} />
            </div>

            <div className="bg-dark-800/50 rounded-xl p-5 mb-6 border border-dark-500">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-blue-300 font-bold">Billing estimate</p>
                  <h3 className="text-white font-semibold mt-1">Calculate card total before checkout</h3>
                </div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Session only</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                We use this once to estimate PandaBase tax and prefill the checkout modal. We do not store your full billing address.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block sm:col-span-1">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Full name</span>
                  <input value={billing.name} onChange={(e) => updateBilling('name', e.target.value)} autoComplete="billing name" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent" placeholder="Billing name" />
                </label>
                <label className="block sm:col-span-1">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Email</span>
                  <input type="email" value={billing.email} onChange={(e) => updateBilling('email', e.target.value)} autoComplete="email" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent" placeholder="you@example.com" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Address line 1</span>
                  <input value={billing.line1} onChange={(e) => updateBilling('line1', e.target.value)} autoComplete="billing address-line1" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent" placeholder="Street address" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Address line 2 <span className="text-gray-700">optional</span></span>
                  <input value={billing.line2} onChange={(e) => updateBilling('line2', e.target.value)} autoComplete="billing address-line2" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent" placeholder="Apartment, suite, etc." />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">City</span>
                  <input value={billing.city} onChange={(e) => updateBilling('city', e.target.value)} autoComplete="billing address-level2" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent" placeholder="City" />
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Country</span>
                  <select value={billing.country} onChange={(e) => updateBilling('country', e.target.value)} autoComplete="billing country" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">State / province</span>
                  {billing.country === 'US' ? (
                    <select value={billing.state} onChange={(e) => updateBilling('state', e.target.value)} autoComplete="billing address-level1" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-accent">
                      <option value="">Select state...</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input value={billing.state} onChange={(e) => updateBilling('state', e.target.value)} autoComplete="billing address-level1" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent" placeholder="State / province" />
                  )}
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">ZIP / postal code</span>
                  <input value={billing.postal_code} onChange={(e) => updateBilling('postal_code', e.target.value)} autoComplete="billing postal-code" className="w-full bg-dark-800 border border-dark-500 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent" placeholder="ZIP / postal" />
                </label>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleEstimateCardTotal}
                  disabled={estimateLoading || !amount || getUsdAmount() < 5 || !billingReady()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-blue-400/40 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-blue-200 text-xs uppercase tracking-wider font-bold transition-colors"
                >
                  {estimateLoading ? 'Calculating...' : cardEstimate ? 'Recalculate Card Total' : 'Calculate Card Total'}
                </button>
                {!billingReady() && amount && getUsdAmount() >= 5 && (
                  <p className="text-[10px] text-gray-500 text-center">Complete billing details to unlock the card total.</p>
                )}
              </div>

              {cardEstimate && (
                <div className="mt-5 rounded-xl border border-dark-500 bg-dark-900/60 p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400"><span>You receive</span><span className="text-white">${cardEstimate.walletCredit.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>Processing recovery</span><span>+${cardEstimate.processingRecovery.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-400"><span>Estimated tax</span><span>+${cardEstimate.tax.toFixed(2)}</span></div>
                    <div className="flex justify-between text-white font-bold pt-2 border-t border-dark-600"><span>You pay today</span><span>${cardEstimate.total.toFixed(2)}</span></div>
                  </div>
                  <div className="mt-4 rounded-lg border border-[#e1ad2d]/30 bg-[#e1ad2d]/10 p-3 text-center">
                    <p className="text-xs text-[#e1ad2d] font-bold">Crypto would cost ${cardEstimate.walletCredit.toFixed(2)} — save ${cardEstimate.cryptoSavings.toFixed(2)}</p>
                    <button
                      onClick={() => { setTab('crypto'); posthog.capture('crypto_upsell_clicked', { savings: cardEstimate.cryptoSavings, source: 'card_estimate_review' }) }}
                      className="mt-2 text-[10px] uppercase tracking-wider text-[#e1ad2d] hover:underline font-bold"
                    >
                      Switch to crypto and save
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-3 text-center">PandaBase calculates final tax from your billing address. The modal should be prefilled from the details above.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 mb-6">
              <button
                onClick={handleCardDeposit}
                disabled={loading || !amount || getUsdAmount() < 5 || !agreedToTerms || !billingReady() || !cardEstimate}
                className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[48px] sm:h-[54px] w-auto" style={{ imageRendering: 'pixelated' }} />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-xs sm:text-sm uppercase tracking-wider">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : cardEstimate ? 'Continue with Card' : 'Calculate Total First'}
                </span>
              </button>
              {!cardEstimate && amount && getUsdAmount() >= 5 && agreedToTerms && (
                <p className="text-[10px] text-gray-500">Calculate the card total above before opening PandaBase.</p>
              )}
            </div>
          </>
        )}

        {/* Crypto Tab Content — Currency selector + deposit */}
        {tab === 'crypto' && !cryptoPayment && (
          <>
            <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
              <label className="block text-sm text-gray-400 mb-3 text-center">Select cryptocurrency</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {POPULAR_CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCryptoCurrency(c)}
                    className={`relative flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all duration-200 ${cryptoCurrency === c ? 'border-accent/60 bg-accent/10' : 'border-dark-500 bg-dark-800 hover:border-dark-400'}`}
                  >
                    <img src={getCryptoIcon(c)} alt={c} className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain" style={{ filter: cryptoCurrency === c ? 'none' : 'brightness(0.6)' }} />
                    <span className={`font-bold text-[10px] sm:text-xs uppercase tracking-wider ${cryptoCurrency === c ? 'text-white' : 'text-gray-400'}`}>
                      {c.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search for more currencies */}
              <div className="relative">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search 100+ currencies..."
                    value={cryptoSearch}
                    onChange={(e) => { setCryptoSearch(e.target.value); setShowCryptoDropdown(true) }}
                    onFocus={() => setShowCryptoDropdown(true)}
                    className="w-full bg-dark-800 border border-dark-500 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                {showCryptoDropdown && cryptoSearch && (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-dark-800 border border-dark-500 rounded-lg shadow-xl shadow-black/30">
                    {allCurrencies
                      .filter((c) => {
                        const q = cryptoSearch.toLowerCase()
                        const name = CURRENCY_NAMES[c]?.toLowerCase() || ''
                        return c.toLowerCase().includes(q) || name.includes(q)
                      })
                      .slice(0, 20)
                      .map((c) => (
                        <button
                          key={c}
                          onClick={() => { setCryptoCurrency(c); setCryptoSearch(''); setShowCryptoDropdown(false) }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-600 hover:text-white transition-colors"
                        >
                          <img
                            src={getCryptoIcon(c)}
                            alt={c}
                            className="w-5 h-5 object-contain shrink-0 rounded-full"
                          />
                          <span className="font-medium">{c.toUpperCase()}</span>
                          {CURRENCY_NAMES[c] && <span className="text-gray-500 text-xs ml-auto">{CURRENCY_NAMES[c]}</span>}
                        </button>
                      ))}
                    {allCurrencies.filter((c) => {
                      const q = cryptoSearch.toLowerCase()
                      const name = CURRENCY_NAMES[c]?.toLowerCase() || ''
                      return c.toLowerCase().includes(q) || name.includes(q)
                    }).length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-500 text-center">No currencies found</p>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center mt-3">No processing fees on crypto deposits</p>
            </div>

            <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
              <input type="text" name="website" value={hpField} onChange={(e) => setHpField(e.target.value)} autoComplete="off" tabIndex={-1} />
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleCryptoDeposit}
                disabled={loading || !amount || getUsdAmount() < 5 || !agreedToTerms}
                className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[48px] sm:h-[54px] w-auto" style={{ imageRendering: 'pixelated' }} />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-xs sm:text-sm uppercase tracking-wider">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : `Deposit with ${cryptoCurrency.toUpperCase()}`}
                </span>
              </button>
            </div>
          </>
        )}

        {/* Crypto Payment Details */}
        {tab === 'crypto' && cryptoPayment && (
          <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-center mb-4">Send Payment</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount to send</label>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg flex-1 font-mono">{cryptoPayment.payAmount} {cryptoPayment.payCurrency.toUpperCase()}</span>
                  <button onClick={() => copyToClipboard(cryptoPayment.payAmount.toString())} className="px-3 py-1.5 bg-dark-600 hover:bg-dark-500 text-xs text-gray-300 rounded-lg">Copy</button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Send to address</label>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-mono flex-1 break-all">{cryptoPayment.payAddress}</span>
                  <button onClick={() => copyToClipboard(cryptoPayment.payAddress)} className="px-3 py-1.5 bg-dark-600 hover:bg-dark-500 text-xs text-gray-300 rounded-lg shrink-0">Copy</button>
                </div>
              </div>

              <div className="pt-3 border-t border-dark-600">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-white">Wallet credit</span>
                  <span className="text-white">{formatPrice(parseFloat(amount))}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-yellow-400 text-sm">Waiting for payment...</span>
              </div>

              <button
                onClick={() => { setCryptoPayment(null); if (pollRef.current) clearInterval(pollRef.current) }}
                className="w-full py-2 bg-dark-600 hover:bg-dark-500 text-gray-400 text-sm rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Pending Deposits */}
        {pendingDeposits.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Pending Deposits</h2>
            <div className="space-y-3">
              {pendingDeposits.map((deposit) => (
                <div key={deposit.id} className="bg-dark-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setExpandedId(expandedId === deposit.id ? null : deposit.id)} className="flex items-center gap-2 text-left">
                      <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === deposit.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-white font-medium">{formatPrice(deposit.amount)}</span>
                      <span className="text-gray-500 text-sm">{new Date(deposit.createdAt).toLocaleString()}</span>
                    </button>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => handleVerify(deposit.id)}
                        disabled={verifyingId === deposit.id}
                        className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <img src="/images/pixel/pngs/asset-60.png" alt="" className="h-[32px] w-auto" style={{ imageRendering: 'pixelated' }} />
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[9px] uppercase tracking-wider">
                          {verifyingId === deposit.id ? 'Checking...' : 'Verify'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleCancelDeposit(deposit.id)}
                        disabled={cancellingId === deposit.id}
                        className="px-3 py-2 bg-dark-600 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider transition-colors"
                        style={{ border: '2px solid #2a2a2e' }}
                      >
                        {cancellingId === deposit.id ? '...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                  {expandedId === deposit.id && (
                    <div className="mt-3 pt-3 border-t border-dark-600 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Deposit ID</span><button onClick={() => copyToClipboard(deposit.id)} className="text-gray-300 hover:text-white font-mono text-xs">{deposit.id}</button></div>
                      <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="text-gray-300">{formatPrice(deposit.amount)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-300">{new Date(deposit.createdAt).toLocaleString()}</span></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deposit History */}
        {completedDeposits.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Deposit History</h2>
            <div className="space-y-2">
              {completedDeposits.map((deposit) => (
                <div key={deposit.id} className="bg-dark-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{formatPrice(deposit.amount)}</span>
                      <span className="text-gray-500 text-sm">{new Date(deposit.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded ${deposit.status === 'completed' ? 'bg-green-500/20 text-green-400' : deposit.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {deposit.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
