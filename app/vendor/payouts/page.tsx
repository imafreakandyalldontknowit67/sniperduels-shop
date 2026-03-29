'use client'

import { useState, useEffect } from 'react'
import { Banknote, Wallet, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'

interface Payout {
  id: string
  vendorId: string
  amount: number
  paymentMethod: string
  status: 'pending' | 'completed' | 'rejected'
  adminNotes?: string
  createdAt: string
  completedAt?: string
}

export default function VendorPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchPayouts()
  }, [])

  async function fetchPayouts() {
    try {
      const res = await fetch('/api/vendor/payouts')
      if (res.ok) {
        const data = await res.json()
        setPayouts(data.payouts)
        setBalance(data.balance)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount < 1) {
      setError('Amount must be at least $1')
      return
    }
    if (numAmount > balance) {
      setError('Amount exceeds your balance')
      return
    }
    if (!paymentMethod.trim()) {
      setError('Enter your payment details')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, paymentMethod: paymentMethod.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Payout request submitted! You\'ll be paid once an admin approves it.')
        setAmount('')
        setPaymentMethod('')
        setBalance(data.newBalance)
        await fetchPayouts()
      } else {
        setError(data.error || 'Failed to request payout')
      }
    } catch {
      setError('Network error')
    }
    setSubmitting(false)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-yellow-400 text-[10px] uppercase">
            <Clock className="w-3 h-3" /> Pending
          </span>
        )
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-green-400 text-[10px] uppercase">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        )
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-red-400 text-[10px] uppercase">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  const hasPending = payouts.some(p => p.status === 'pending')

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2 uppercase">Cash Out</h1>
      <p className="text-gray-400 text-xs mb-8">Withdraw your earnings to your preferred payment method</p>

      {/* Balance Card */}
      <div className="p-4 mb-8" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-green-400" />
          <span className="text-[10px] text-gray-400 uppercase">Available Balance</span>
        </div>
        <p className="text-3xl font-bold text-white">${balance.toFixed(2)}</p>
      </div>

      {/* Payout Request Form */}
      {hasPending ? (
        <div className="p-4 mb-8 flex items-center gap-3" style={{ background: '#1a1a1e', border: '2px solid #e1ad2d33' }}>
          <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-white text-sm font-bold">Payout Pending</p>
            <p className="text-gray-400 text-xs">You have a pending payout request. Wait for it to be processed before requesting another.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 mb-8" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <h2 className="text-sm font-bold text-white uppercase mb-4">Request Payout</h2>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-4 p-2 bg-red-500/10 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-400 text-xs mb-4 p-2 bg-green-500/10 rounded">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 rounded bg-dark-800 text-white border border-dark-700 focus:border-accent outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase block mb-1">Payment Method</label>
              <textarea
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g. PayPal: myemail@gmail.com&#10;or CashApp: $mytag&#10;or Roblox Gift Card"
                rows={3}
                className="w-full p-3 rounded bg-dark-800 text-white border border-dark-700 focus:border-accent outline-none text-sm resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || balance < 1}
              className="w-full py-3 rounded font-bold text-sm uppercase transition-colors disabled:opacity-50"
              style={{ background: '#e1ad2d', color: '#1a1a1e' }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                `Request Payout`
              )}
            </button>
          </div>
        </form>
      )}

      {/* Payout History */}
      <h2 className="text-sm font-bold text-white uppercase mb-4">Payout History</h2>
      {payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <Banknote className="w-8 h-8 text-gray-600 mb-3" />
          <p className="text-gray-500 text-xs uppercase">No payouts yet</p>
          <p className="text-gray-600 text-[10px] mt-1">Request a payout when you have earnings in your wallet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payouts.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3"
              style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
            >
              <div>
                <p className="text-white text-sm font-bold">${p.amount.toFixed(2)}</p>
                <p className="text-gray-500 text-[10px] max-w-[200px] truncate">{p.paymentMethod}</p>
                {p.adminNotes && (
                  <p className="text-gray-400 text-[10px] mt-0.5">Note: {p.adminNotes}</p>
                )}
              </div>
              <div className="text-right">
                {statusBadge(p.status)}
                <span className="text-gray-500 text-[10px] block mt-1">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
