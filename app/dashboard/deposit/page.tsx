'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useAuth } from '@/components/providers'
import type { Deposit } from '@/lib/storage'

const PRESET_AMOUNTS = [5, 10, 25, 50, 100]
const POPULAR_CURRENCIES = ['btc', 'eth', 'sol', 'usdtsol', 'usdcsol', 'ltc']

type Tab = 'card' | 'crypto'

export default function DepositPage() {
  const router = useRouter()
  const { user, isLoading, walletBalance: authWalletBalance } = useAuth()
  const [tab, setTab] = useState<Tab>('card')
  const [amount, setAmount] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hpField, setHpField] = useState('')

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

  // ── Card/CashApp deposit (Pandabase) ──
  async function handleCardDeposit() {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount < 5 || numAmount > 500) {
      setMessage({ type: 'error', text: 'Amount must be between $5 and $500' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/deposits/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, website: hpField }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Failed to create deposit' }); return }

      posthog.capture('deposit_initiated', { amount: numAmount, method: 'card' })

      const win = window as unknown as { Pandabase?: { checkout: (opts: Record<string, unknown>) => { open: () => void; destroy: () => void } } }
      if (win.Pandabase && data.sessionId) {
        const checkout = win.Pandabase.checkout({
          storeId: 'shp_szumqvgl22fkw6m5030elu6dgi',
          sessionId: data.sessionId,
          mode: 'modal',
          theme: 'dark',
          onPaymentSuccess: () => {
            setMessage({ type: 'success', text: `$${numAmount.toFixed(2)} payment received! Crediting your wallet...` })
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
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount < 5 || numAmount > 500) {
      setMessage({ type: 'error', text: 'Amount must be between $5 and $500' })
      return
    }
    setLoading(true)
    setMessage(null)
    setCryptoPayment(null)
    try {
      const res = await fetch('/api/deposits/create-crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, currency: cryptoCurrency, website: hpField }),
      })
      const data = await res.json()
      if (!res.ok) { setMessage({ type: 'error', text: data.error || 'Failed to create crypto deposit' }); return }

      posthog.capture('deposit_initiated', { amount: numAmount, method: 'crypto', currency: cryptoCurrency })
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

  const pendingDeposits = deposits.filter(d => d.status === 'pending')
  const completedDeposits = deposits.filter(d => d.status !== 'pending')

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-xl mb-8">
        <h1 className="text-2xl font-bold text-white text-center">Add Balance</h1>
        <p className="text-gray-400 mt-1 text-center">
          Current balance: <span className="text-white font-medium">${walletBalance.toFixed(2)}</span>
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
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
              +5%
            </span>
          </button>
        </div>

        {/* Amount Input (shared) */}
        <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
          <label className="block text-sm text-gray-400 mb-3 text-center">Deposit amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="5"
              max="500"
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
                ${p}
              </button>
            ))}
          </div>
          {tab === 'crypto' && amount && parseFloat(amount) >= 5 && (
            <p className="text-green-400 text-xs text-center mt-3">
              You&apos;ll receive ${(parseFloat(amount) * 1.05).toFixed(2)} in your wallet (5% bonus)
            </p>
          )}
        </div>

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
              disabled={loading || !amount || parseFloat(amount) < 5}
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

        {/* Crypto Tab Content */}
        {tab === 'crypto' && !cryptoPayment && (
          <>
            <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
              <label className="block text-sm text-gray-400 mb-3 text-center">Select cryptocurrency</label>
              {/* Popular coins */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {POPULAR_CURRENCIES.map((id) => (
                  <button
                    key={id}
                    onClick={() => { setCryptoCurrency(id); setCryptoSearch(''); setShowCryptoDropdown(false) }}
                    className={`py-3 px-2 text-xs font-bold rounded-lg transition-colors text-center uppercase ${cryptoCurrency === id ? 'bg-accent text-white' : 'bg-dark-600 hover:bg-dark-500 text-gray-300'}`}
                  >
                    {id}
                  </button>
                ))}
              </div>
              {/* Search all currencies */}
              <div className="relative">
                <input
                  type="text"
                  value={cryptoSearch || (showCryptoDropdown ? '' : cryptoCurrency.toUpperCase())}
                  onChange={(e) => { setCryptoSearch(e.target.value); setShowCryptoDropdown(true) }}
                  onFocus={() => setShowCryptoDropdown(true)}
                  placeholder="Search all 280+ currencies..."
                  className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
                />
                {showCryptoDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-dark-800 border border-dark-500 rounded-lg max-h-48 overflow-y-auto">
                    {allCurrencies
                      .filter(c => !cryptoSearch || c.toLowerCase().includes(cryptoSearch.toLowerCase()))
                      .slice(0, 50)
                      .map(c => (
                        <button
                          key={c}
                          onClick={() => { setCryptoCurrency(c); setCryptoSearch(''); setShowCryptoDropdown(false) }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-dark-600 transition-colors uppercase ${c === cryptoCurrency ? 'text-accent font-bold' : 'text-gray-300'}`}
                        >
                          {c}
                        </button>
                      ))
                    }
                    {allCurrencies.filter(c => !cryptoSearch || c.toLowerCase().includes(cryptoSearch.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">No currencies found</div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Selected: <span className="text-white font-bold uppercase">{cryptoCurrency}</span>
              </p>
            </div>

            <button
              onClick={handleCryptoDeposit}
              disabled={loading || !amount || parseFloat(amount) < 5}
              className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-lg transition-colors"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating payment...
                </span>
              ) : 'Pay with Crypto (+5% bonus)'}
            </button>
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
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Deposit</span>
                  <span className="text-white">${amount}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-green-400">5% Bonus</span>
                  <span className="text-green-400">+${cryptoPayment.bonusAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1 font-bold">
                  <span className="text-white">Wallet credit</span>
                  <span className="text-white">${(parseFloat(amount) + cryptoPayment.bonusAmount).toFixed(2)}</span>
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
                      <span className="text-white font-medium">${deposit.amount.toFixed(2)}</span>
                      <span className="text-gray-500 text-sm">{new Date(deposit.createdAt).toLocaleString()}</span>
                    </button>
                    <button
                      onClick={() => handleVerify(deposit.id)}
                      disabled={verifyingId === deposit.id}
                      className="px-4 py-2 bg-accent hover:bg-accent-light disabled:bg-accent/50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {verifyingId === deposit.id ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                  {expandedId === deposit.id && (
                    <div className="mt-3 pt-3 border-t border-dark-600 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Deposit ID</span><button onClick={() => copyToClipboard(deposit.id)} className="text-gray-300 hover:text-white font-mono text-xs">{deposit.id}</button></div>
                      <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="text-gray-300">${deposit.amount.toFixed(2)}</span></div>
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
                      <span className="text-white font-medium">${deposit.amount.toFixed(2)}</span>
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
