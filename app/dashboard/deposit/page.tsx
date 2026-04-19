'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

export default function DepositPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading, walletBalance: authWalletBalance } = useAuth()
  const { formatPrice, isUsd, currency, currencySymbol, convertToUsd, convertFromUsd } = useCurrency()
  const [tab, setTab] = useState<Tab>('card')
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
        fetch('/api/bot/status').then(r => r.json()).then(d => setBotOnline(d.online)).catch(() => {})
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) { router.push('/'); return null }

  // Convert input amount (in user's currency) to USD
  function getUsdAmount(): number {
    const numAmount = parseFloat(amount)
    if (!numAmount) return 0
    return isUsd ? numAmount : convertToUsd(numAmount)
  }

  // Get min in user's currency
  const minLocal = isUsd ? 5 : convertFromUsd(5)

  // ── Card/CashApp deposit (Pandabase) ──
  async function handleCardDeposit() {
    const usdAmount = getUsdAmount()
    if (!usdAmount || usdAmount < 5) {
      setMessage({ type: 'error', text: `Amount must be at least ${currencySymbol}${Math.ceil(minLocal)}` })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/deposits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: usdAmount, website: hpField }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Failed to create deposit' }); return }

      posthog.capture('deposit_initiated', { amount: usdAmount, method: 'card' })

      const win = window as unknown as { Pandabase?: { checkout: (opts: Record<string, unknown>) => { open: () => void; destroy: () => void } } }
      if (win.Pandabase && data.sessionId) {
        const checkout = win.Pandabase.checkout({
          storeId: 'shp_szumqvgl22fkw6m5030elu6dgi',
          sessionId: data.sessionId,
          mode: 'modal',
          theme: 'dark',
          onPaymentSuccess: () => {
            setMessage({ type: 'success', text: `${formatPrice(usdAmount)} payment received! Crediting your wallet...` })
            setAmount('')
            setTimeout(() => { handleVerify(data.depositId); fetchDeposits() }, 2000)
            checkout.destroy()
          },
          onPaymentFailed: () => { posthog.capture('deposit_failed', { amount: usdAmount, method: 'card', reason: 'payment_failed' }); setMessage({ type: 'error', text: 'Payment failed. Please try again.' }); checkout.destroy() },
          onClose: () => { posthog.capture('deposit_checkout_closed', { amount: usdAmount, method: 'card' }); fetchDeposits() },
        })
        checkout.open()
        posthog.capture('checkout_modal_opened', { amount: usdAmount, method: 'card' })
      } else {
        window.open(data.checkoutUrl, '_blank')
        setMessage({ type: 'success', text: 'Checkout opened. Complete payment then verify below.' })
      }
      setAmount('')
      fetchDeposits()
    } catch { setMessage({ type: 'error', text: 'Something went wrong' }) }
    finally { setLoading(false) }
  }

  // ── Crypto deposit (NearPayments) ──
  async function handleCryptoDeposit() {
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
        body: JSON.stringify({ amount: usdAmount, currency: cryptoCurrency, website: hpField }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Failed to create crypto deposit' }); return }

      posthog.capture('deposit_initiated', { amount: usdAmount, method: 'crypto', currency: cryptoCurrency })
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
          posthog.capture('deposit_completed', { amount: verifyData.amount || 0, method: 'crypto' })
          setWalletBalance(verifyData.walletBalance)
          setMessage({ type: 'success', text: verifyData.message })
          setCryptoPayment(null)
          setAmount('')
          fetchDeposits()
        } else if (verifyData.status === 'failed' || verifyData.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current)
          posthog.capture('deposit_failed', { method: 'crypto', reason: verifyData.status })
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
        posthog.capture('deposit_completed', { amount: data.amount || 0, method: 'card' })
        setWalletBalance(data.walletBalance)
        setMessage({ type: 'success', text: data.message })
        fetchDeposits()
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
    <div className="flex flex-col items-center">
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
              type="number"
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
              Crypto deposits are processed manually with no fees
            </p>
          )}
          {tab === 'card' && amount && getUsdAmount() >= 5 && (
            <div className="text-xs text-center mt-3 space-y-1">
              <div className="flex justify-between text-gray-400 px-4">
                <span>Wallet credit</span>
                <span>${getUsdAmount().toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-gray-400 px-4">
                <span>Processing fee (7% + $0.35)</span>
                <span>+${(getUsdAmount() * 0.07 + 0.35).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-medium px-4 pt-1 border-t border-dark-600">
                <span>Total charge</span>
                <span>${(getUsdAmount() + getUsdAmount() * 0.07 + 0.35).toFixed(2)}</span>
              </div>
              {!isUsd && (
                <p className="text-[10px] text-gray-500 mt-2">Pandabase will show the final amount in your local currency at checkout.</p>
              )}
            </div>
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
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[200px] sm:w-[240px] p-3 rounded-lg border border-dark-500 bg-dark-900/95 backdrop-blur-sm shadow-xl shadow-black/40 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-20">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-dark-900/95 border-r border-b border-dark-500" />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { name: 'Visa', src: '/images/payment/visa.svg' },
                    { name: 'Mastercard', src: '/images/payment/mastercard.svg' },
                    { name: 'Pix', src: '/images/payment/pix.svg' },
                    { name: 'iDEAL', src: '/images/payment/ideal.svg' },
                    { name: 'Alipay', src: '/images/payment/alipay.svg' },
                    { name: 'Samsung Pay', src: '/images/payment/samsungpay.svg' },
                    { name: 'Bancontact', src: '/images/payment/bancontact.svg' },
                    { name: 'SEPA', src: '/images/payment/sepa.svg' },
                  ].map((pm) => (
                    <div key={pm.name} className="flex flex-col items-center gap-0.5">
                      <div className="w-[32px] h-[20px] flex items-center justify-center">
                        <img src={pm.src} alt={pm.name} className="max-w-full max-h-full object-contain" style={{ filter: 'brightness(1.1)' }} />
                      </div>
                      <span className="text-[6px] uppercase tracking-wider text-gray-600">{pm.name}</span>
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

            <div className="flex justify-center">
              <button
                onClick={handleCardDeposit}
                disabled={loading || !amount || getUsdAmount() < 5 || !agreedToTerms}
                className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[48px] sm:h-[54px] w-auto" style={{ imageRendering: 'pixelated' }} />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-xs sm:text-sm uppercase tracking-wider">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : 'Continue to Payment'}
                </span>
              </button>
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
