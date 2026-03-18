'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Clock, CheckCircle, XCircle, AlertCircle, Package, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface VendorDeposit {
  id: string
  vendorId: string
  amountK: number
  status: 'pending' | 'queued' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

const statusConfig = {
  pending: { icon: Clock, color: '#eab308', label: 'Pending' },
  queued: { icon: AlertCircle, color: '#3b82f6', label: 'In Queue' },
  completed: { icon: CheckCircle, color: '#22c55e', label: 'Completed' },
  failed: { icon: XCircle, color: '#ef4444', label: 'Failed' },
}

export default function VendorDepositPage() {
  const router = useRouter()
  const [deposits, setDeposits] = useState<VendorDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [amountK, setAmountK] = useState('50')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchDeposits()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchDeposits() {
    try {
      const res = await fetch('/api/vendor/deposits')
      if (res.ok) {
        const data = await res.json()
        setDeposits(data.deposits)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseInt(amountK)
    if (!amount || amount < 1) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/vendor/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountK: amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', text: data.error })
        return
      }
      // Redirect to the order tracking page — same queue as customer orders
      router.push(`/dashboard/orders/${data.order.id}`)
    } catch {
      setToast({ type: 'error', text: 'Failed to create deposit' })
    } finally {
      setSubmitting(false)
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
      <h1 className="text-2xl font-bold text-white mb-2 uppercase">Deposit Gems</h1>
      <p className="text-gray-400 text-xs mb-8">Queue gem deposits to add to your stock</p>

      {/* Deposit Form */}
      <div className="p-6 mb-8" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
        <h2 className="text-sm font-bold text-white uppercase mb-4">New Deposit</h2>
        <p className="text-xs text-gray-400 mb-4">
          Enter the amount of gems you want to deposit. Your deposit will be added to the order queue.
          When it&apos;s your turn, you&apos;ll get the private server link to join and trade your gems to the stock bot.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <div>
            <label className="block text-[10px] text-gray-400 uppercase mb-1">Amount (k gems)</label>
            <input
              type="number"
              value={amountK}
              onChange={e => setAmountK(e.target.value)}
              min="1"
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
              {submitting ? 'Queuing...' : 'Queue Deposit'}
            </span>
          </button>
        </form>
      </div>

      {/* Deposit History */}
      <h2 className="text-sm font-bold text-white uppercase mb-4">Deposit History</h2>
      {deposits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <Package className="w-8 h-8 text-gray-600 mb-3" />
          <p className="text-gray-500 text-xs uppercase">No deposits yet</p>
          <p className="text-gray-600 text-[10px] mt-1">Queue your first deposit above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deposits.map(dep => {
            const config = statusConfig[dep.status]
            const Icon = config.icon
            return (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3"
                style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                  <span className="text-white text-sm font-bold">{dep.amountK}k gems</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] uppercase font-bold" style={{ color: config.color }}>
                    {config.label}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(dep.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
