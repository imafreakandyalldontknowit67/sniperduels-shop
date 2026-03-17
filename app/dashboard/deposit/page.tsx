'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useAuth } from '@/components/providers'
import type { Deposit } from '@/lib/storage'

const PRESET_AMOUNTS = [1, 3, 5, 10, 25, 50]

export default function DepositPage() {
  const router = useRouter()
  const { user, isLoading, walletBalance: authWalletBalance } = useAuth()
  const [amount, setAmount] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hpField, setHpField] = useState('')

  useEffect(() => {
    if (!isLoading) {
      setWalletBalance(authWalletBalance)
      if (user) {
        fetchDeposits()
      }
    }
  }, [isLoading, user, authWalletBalance])

  async function fetchDeposits() {
    try {
      const res = await fetch('/api/deposits')
      if (res.ok) {
        const data = await res.json()
        setDeposits(data)
      }
    } catch {
      // silently fail
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    router.push('/')
    return null
  }

  async function handleDeposit() {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount < 1 || numAmount > 500) {
      setMessage({ type: 'error', text: 'Amount must be between $1 and $500' })
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

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to create deposit' })
        return
      }

      posthog.capture('deposit_initiated', { amount: numAmount })

      // Use Pandabase SDK modal if available, fallback to redirect
      const win = window as unknown as { Pandabase?: { checkout: (opts: Record<string, unknown>) => { open: () => void; destroy: () => void } } }
      const Pandabase = win.Pandabase as {
        checkout: (opts: Record<string, unknown>) => { open: () => void; destroy: () => void }
      } | undefined

      if (Pandabase && data.sessionId) {
        const storeId = process.env.NEXT_PUBLIC_PANDABASE_SHOP_ID || 'shp_szumqvgl22fkw6m5030elu6dgi'
        const checkout = Pandabase.checkout({
          storeId,
          sessionId: data.sessionId,
          mode: 'modal',
          theme: 'dark',
          onPaymentSuccess: () => {
            setMessage({ type: 'success', text: `$${numAmount.toFixed(2)} payment received! Crediting your wallet...` })
            setAmount('')
            // Auto-verify after a short delay to let webhook process
            setTimeout(() => {
              handleVerify(data.depositId)
              fetchDeposits()
            }, 2000)
            checkout.destroy()
          },
          onPaymentFailed: () => {
            setMessage({ type: 'error', text: 'Payment failed. Please try again.' })
            checkout.destroy()
          },
          onClose: () => {
            fetchDeposits()
          },
        })
        checkout.open()
      } else {
        // Fallback: redirect to checkout URL
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        if (isMobile) {
          window.location.href = data.checkoutUrl
          return
        }
        window.open(data.checkoutUrl, '_blank')
        setMessage({ type: 'success', text: 'Checkout opened in a new tab. Complete payment then click "Verify Payment" below.' })
      }
      setAmount('')
      fetchDeposits()
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' })
    } finally {
      setLoading(false)
    }
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
        setMessage({ type: 'error', text: data.message || 'Payment not yet completed. It may take a moment to process — try again shortly.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to verify payment' })
    } finally {
      setVerifyingId(null)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  const pendingDeposits = deposits.filter(d => d.status === 'pending')
  const completedDeposits = deposits.filter(d => d.status !== 'pending')

  function DepositDetails({ deposit }: { deposit: Deposit }) {
    return (
      <div className="mt-3 pt-3 border-t border-dark-600 space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Invoice ID</span>
          <button
            onClick={() => copyToClipboard(deposit.pandabaseInvoiceId)}
            className="text-gray-300 hover:text-white font-mono text-xs bg-dark-700 px-2 py-1 rounded hover:bg-dark-600 transition-colors"
            title="Click to copy"
          >
            {deposit.pandabaseInvoiceId}
          </button>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Deposit ID</span>
          <button
            onClick={() => copyToClipboard(deposit.id)}
            className="text-gray-300 hover:text-white font-mono text-xs bg-dark-700 px-2 py-1 rounded hover:bg-dark-600 transition-colors"
            title="Click to copy"
          >
            {deposit.id}
          </button>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Amount</span>
          <span className="text-gray-300">${deposit.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Created</span>
          <span className="text-gray-300">{new Date(deposit.createdAt).toLocaleString()}</span>
        </div>
        {deposit.completedAt && (
          <div className="flex justify-between">
            <span className="text-gray-500">Completed</span>
            <span className="text-gray-300">{new Date(deposit.completedAt).toLocaleString()}</span>
          </div>
        )}
        {deposit.status === 'pending' && (
          <p className="text-gray-500 text-xs mt-2">
            Payment processing can take a moment. If your payment went through but verification keeps failing, contact support with your Invoice ID.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-xl mb-8">
        <h1 className="text-2xl font-bold text-white text-center">Add Balance</h1>
        <p className="text-gray-400 mt-1 text-center">
          Current balance: <span className="text-white font-medium">${walletBalance.toFixed(2)}</span>
        </p>
      </div>

      <div className="w-full max-w-xl">
        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            <p className="text-sm text-center">{message.text}</p>
          </div>
        )}

        {/* Deposit Amount */}
        <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
          <label className="block text-sm text-gray-400 mb-3 text-center">Deposit amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              max="500"
              step="0.01"
              className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-4 pl-10 text-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mt-4">
            {PRESET_AMOUNTS.map((presetAmount) => (
              <button
                key={presetAmount}
                onClick={() => setAmount(presetAmount.toString())}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  amount === presetAmount.toString()
                    ? 'bg-accent text-white'
                    : 'bg-dark-600 hover:bg-dark-500 text-white'
                }`}
              >
                ${presetAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-dark-800/50 rounded-xl p-6 mb-6">
          <label className="block text-sm text-gray-400 mb-4 text-center">Payment methods</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['CashApp', 'Google Pay', 'Apple Pay', 'Bank'].map((method) => (
              <div
                key={method}
                className="flex items-center justify-center px-4 py-3 bg-dark-800 border border-dark-500 rounded-lg"
              >
                <span className="text-sm text-gray-300">{method}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Powered by Pandabase. All fiat methods accepted.
          </p>
        </div>

        {/* Honeypot field — invisible to real users, bots auto-fill it */}
        <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
          <input
            type="text"
            name="website"
            value={hpField}
            onChange={(e) => setHpField(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleDeposit}
          disabled={loading || !amount || parseFloat(amount) < 1}
          className="w-full py-4 bg-accent hover:bg-accent-light disabled:bg-accent/50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-lg transition-colors"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating checkout...
            </span>
          ) : (
            'Continue to Payment'
          )}
        </button>

        {/* Pending Deposits */}
        {pendingDeposits.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white mb-4">Pending Deposits</h2>
            <div className="space-y-3">
              {pendingDeposits.map((deposit) => (
                <div key={deposit.id} className="bg-dark-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(expandedId === deposit.id ? null : deposit.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === deposit.id ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-white font-medium">${deposit.amount.toFixed(2)}</span>
                      <span className="text-gray-500 text-sm">
                        {new Date(deposit.createdAt).toLocaleString()}
                      </span>
                    </button>
                    <button
                      onClick={() => handleVerify(deposit.id)}
                      disabled={verifyingId === deposit.id}
                      className="px-4 py-2 bg-accent hover:bg-accent-light disabled:bg-accent/50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {verifyingId === deposit.id ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Checking...
                        </span>
                      ) : (
                        'Verify Payment'
                      )}
                    </button>
                  </div>
                  {expandedId === deposit.id && <DepositDetails deposit={deposit} />}
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
                    <button
                      onClick={() => setExpandedId(expandedId === deposit.id ? null : deposit.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === deposit.id ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-white font-medium">${deposit.amount.toFixed(2)}</span>
                      <span className="text-gray-500 text-sm">
                        {new Date(deposit.createdAt).toLocaleString()}
                      </span>
                    </button>
                    <span className={`text-sm px-2 py-1 rounded ${
                      deposit.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : deposit.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {deposit.status}
                    </span>
                  </div>
                  {expandedId === deposit.id && <DepositDetails deposit={deposit} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
