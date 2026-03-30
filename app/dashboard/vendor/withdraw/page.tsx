'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Clock, CheckCircle, XCircle, AlertCircle, Package, Loader2, X } from 'lucide-react'

interface VendorWithdrawal {
  id: string
  vendorId: string
  amountK?: number
  quantity?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  orderId?: string
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  pending: { icon: Clock, color: '#eab308', label: 'Pending' },
  processing: { icon: AlertCircle, color: '#3b82f6', label: 'Processing' },
  completed: { icon: CheckCircle, color: '#22c55e', label: 'Completed' },
  failed: { icon: XCircle, color: '#ef4444', label: 'Failed' },
}

export default function VendorWithdrawPage() {
  const router = useRouter()
  const [withdrawals, setWithdrawals] = useState<VendorWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [stockK, setStockK] = useState<number>(0)
  const [amountK, setAmountK] = useState('50')
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    Promise.all([fetchWithdrawals(), fetchStock()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchStock() {
    try {
      const res = await fetch('/api/vendor/listings')
      if (res.ok) {
        const data = await res.json()
        if (data.listing) {
          setStockK(data.listing.stockK ?? 0)
        }
      }
    } catch { /* ignore */ }
  }

  async function fetchWithdrawals() {
    try {
      const res = await fetch('/api/vendor/withdrawals')
      if (res.ok) {
        const data = await res.json()
        setWithdrawals(data.withdrawals)
      }
    } catch { /* ignore */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseInt(amountK)
    if (!amount || amount < 1) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/vendor/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountK: amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', text: data.error })
        return
      }
      router.push(`/dashboard/orders/${data.order.id}`)
    } catch {
      setToast({ type: 'error', text: 'Failed to create withdrawal' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(orderId: string) {
    setCancellingId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', text: data.error })
        return
      }
      setToast({ type: 'success', text: 'Withdrawal cancelled' })
      fetchWithdrawals()
      fetchStock()
    } catch {
      setToast({ type: 'error', text: 'Failed to cancel withdrawal' })
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 text-xs uppercase max-w-sm"
          style={{
            background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `2px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: toast.type === 'success' ? '#4ade80' : '#f87171',
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Page Header */}
      <h1 className="text-2xl font-bold text-white mb-2 uppercase">Withdraw Gems</h1>
      <p className="text-gray-400 text-xs mb-8">Withdraw gems from your shop stock back to your Roblox account</p>

      {/* Current Stock */}
      <div className="p-4 mb-6" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-accent" />
          <span className="text-[10px] text-gray-400 uppercase">Current Stock</span>
        </div>
        <p className="text-2xl font-bold text-white mt-1">{stockK}k gems</p>
      </div>

      {/* Withdrawal Form */}
      <div className="p-6 mb-8" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
        <h2 className="text-sm font-bold text-white uppercase mb-4">New Withdrawal</h2>
        <p className="text-xs text-gray-400 mb-4">
          Enter the amount of gems you want to withdraw from your shop stock. Your withdrawal will be added to the queue.
          When it&apos;s your turn, you&apos;ll get the private server link to join and receive the gems on your Roblox account.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div>
            <label className="block text-[10px] text-gray-400 uppercase mb-1">Amount in thousands (k)</label>
            <input
              type="number"
              value={amountK}
              onChange={e => setAmountK(e.target.value)}
              min="1" max="500"
              className="w-32 px-3 py-2 text-sm text-white focus:outline-none"
              style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !parseInt(amountK)}
            className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[44px] w-auto" style={{ imageRendering: 'pixelated' }} />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] uppercase tracking-wider gap-1">
              <Send className="w-3 h-3" />
              {submitting ? 'Queuing...' : 'Queue Withdrawal'}
            </span>
          </button>
        </form>
      </div>

      {/* Withdrawal History */}
      <h2 className="text-sm font-bold text-white uppercase mb-4">Withdrawal History</h2>
      {withdrawals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <Package className="w-8 h-8 text-gray-600 mb-3" />
          <p className="text-gray-500 text-xs uppercase">No withdrawals yet</p>
          <p className="text-gray-600 text-[10px] mt-1">Queue your first withdrawal above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {withdrawals.map(w => {
            const config = statusConfig[w.status]
            const Icon = config.icon
            return (
              <div
                key={w.id}
                className="flex items-center justify-between p-3"
                style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                  <span className="text-white text-sm font-bold">{w.amountK ?? w.quantity ?? 0}k gems</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] uppercase font-bold" style={{ color: config.color }}>
                    {config.label}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </span>
                  {w.status === 'pending' && w.orderId && (
                    <button
                      onClick={() => handleCancel(w.orderId!)}
                      disabled={cancellingId === w.orderId}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      style={{ border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      <X className="w-3 h-3" />
                      {cancellingId === w.orderId ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
