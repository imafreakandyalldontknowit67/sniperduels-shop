'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useAuth, useCurrency } from '@/components/providers'
import type { Deposit } from '@/lib/storage'

const PRESET_AMOUNTS = [5, 10, 25, 50, 100]
const POPULAR_CURRENCIES = ['btc', 'eth', 'sol', 'usdtsol', 'usdcsol', 'ltc']

type Tab = 'card' | 'crypto'

export default function DepositPage() {
  const router = useRouter()
  const { user, isLoading, walletBalance: authWalletBalance } = useAuth()
  const { formatPrice, isUsd, currency, currencySymbol, convertToUsd, convertFromUsd } = useCurrency()
  const [tab, setTab] = useState<Tab>('card')
  const [amount, setAmount] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hpField, setHpField] = useState('')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

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

  // Get min/max in user's currency
  const minLocal = isUsd ? 5 : convertFromUsd(5)
  const maxLocal = isUsd ? 500 : convertFromUsd(500)

  // ── Card/CashApp deposit (Pandabase) ──
  async function handleCardDeposit() {
    const usdAmount = getUsdAmount()
    if (!usdAmount || usdAmount < 5 || usdAmount > 500) {
      setMessage({ type: 'error', text: `Amount must be between ${currencySymbol}${Math.ceil(minLocal)} and ${currencySymbol}${Math.floor(maxLocal)}` })
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
          onPaymentFailed: () => { setMessage({ type: 'error', text: 'Payment failed. Please try again.' }); checkout.destroy() },
          onClose: () => { fetchDeposits() },
        })
        checkout.open()
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
    if (!usdAmount || usdAmount < 5 || usdAmount > 500) {
      setMessage({ type: 'error', text: `Amount must be between ${currencySymbol}${Math.ceil(minLocal)} and ${currencySymbol}${Math.floor(maxLocal)}` })
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
          setWalletBalance(verifyData.walletBalance)
          setMessage({ type: 'success', text: verifyData.message })
          setCryptoPayment(null)
          setAmount('')
          fetchDeposits()
        } else if (verifyData.status === 'failed' || verifyData.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current)
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
      </div>

      <div className="w-full max-w-xl">
        {message && (
          <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            <p className="text-sm text-center">{message.text}</p>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab('card'); setCryptoPayment(null); if (pollRef.current) clearInterval(pollRef.current) }}
            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-colors ${tab === 'card' ? 'bg-accent text-white' : 'bg-dark-600 hover:bg-dark-500 text-gray-400'}`}
          >
            Card / CashApp
          </button>
          <button
            onClick={() => setTab('crypto')}
            className={`flex-1 py-3 text-sm font-medium rounded-lg transition-colors relative ${tab === 'crypto' ? 'bg-accent text-white' : 'bg-dark-600 hover:bg-dark-500 text-gray-400'}`}
          >
            Crypto
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
              max={Math.floor(maxLocal)}
              step="0.01"
              className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-4 pl-10 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <div className="flex gap-2 mt-4">
            {PRESET_AMOUNTS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p.toString())}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${amount === p.toString() ? 'bg-accent text-white' : 'bg-dark-600 hover:bg-dark-500 text-white'}`}
              >
                {currencySymbol}{p}
              </button>
            ))}
          </div>
          {!isUsd && amount && parseFloat(amount) > 0 && (
            <p className="text-xs text-center mt-3 text-accent">
              {currencySymbol}{parseFloat(amount).toFixed(2)} {currency} ≈ ${getUsdAmount().toFixed(2)} USD
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
                <span>Total charge (USD)</span>
                <span>${(getUsdAmount() + getUsdAmount() * 0.07 + 0.35).toFixed(2)}</span>
              </div>
              {!isUsd && (
                <p className="text-[10px] text-gray-500 mt-2">Your card will be charged in USD. Your bank may apply its own conversion rate.</p>
              )}
            </div>
          )}
        </div>

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
            <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
              <label className="block text-sm text-gray-400 mb-4 text-center">Payment methods</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['CashApp', 'Google Pay', 'Apple Pay', 'Bank'].map((method) => (
                  <div key={method} className="flex items-center justify-center px-4 py-3 bg-dark-800 border border-dark-500 rounded-lg">
                    <span className="text-sm text-gray-300">{method}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">Powered by Pandabase</p>
            </div>

            <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
              <input type="text" name="website" value={hpField} onChange={(e) => setHpField(e.target.value)} autoComplete="off" tabIndex={-1} />
            </div>

            <button
              onClick={handleCardDeposit}
              disabled={loading || !amount || getUsdAmount() < 5 || !agreedToTerms}
              className="w-full py-4 bg-accent hover:bg-accent-light disabled:bg-accent/50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-lg transition-colors"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating checkout...
                </span>
              ) : 'Continue to Payment'}
            </button>
          </>
        )}

        {/* Crypto Tab Content — Manual via Discord */}
        {tab === 'crypto' && !cryptoPayment && (
          <div className="bg-dark-800/50 rounded-xl p-6 mb-6 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            <h3 className="text-white font-semibold text-lg mb-2">Crypto Deposits via Discord</h3>
            <p className="text-gray-400 text-sm mb-6">
              To deposit with crypto, open a support ticket in our Discord and we&apos;ll process it for you manually. No processing fees.
            </p>
            <a
              href="https://discord.gg/sniperduels"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-xl text-lg transition-colors"
            >
              Open a Ticket on Discord
            </a>
          </div>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(deposit.id)}
                        disabled={verifyingId === deposit.id}
                        className="px-4 py-2 bg-accent hover:bg-accent-light disabled:bg-accent/50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {verifyingId === deposit.id ? 'Checking...' : 'Verify'}
                      </button>
                      <button
                        onClick={() => handleCancelDeposit(deposit.id)}
                        disabled={cancellingId === deposit.id}
                        className="px-3 py-2 bg-dark-600 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 text-gray-400 text-sm rounded-lg transition-colors"
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
