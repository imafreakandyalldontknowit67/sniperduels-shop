'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Percent, BarChart3, Loader2 } from 'lucide-react'

interface Earning {
  id: string
  vendorId: string
  orderId: string
  saleAmount: number
  platformFee: number
  netAmount: number
  createdAt: string
}

interface Summary {
  totalSales: number
  totalFees: number
  totalNet: number
  count: number
}

export default function VendorEarningsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEarnings()
  }, [])

  async function fetchEarnings() {
    try {
      const res = await fetch('/api/vendor/earnings')
      if (res.ok) {
        const data = await res.json()
        setEarnings(data.earnings)
        setSummary(data.summary)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
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
      {/* Page Header */}
      <h1 className="text-2xl font-bold text-white mb-2 uppercase">Earnings</h1>
      <p className="text-gray-400 text-xs mb-8">Track your sales revenue and platform fees</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-[10px] text-gray-400 uppercase">Net Earnings</span>
          </div>
          <p className="text-2xl font-bold text-white">${summary?.totalNet.toFixed(2) ?? '0.00'}</p>
        </div>
        <div className="p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-[10px] text-gray-400 uppercase">Total Sales</span>
          </div>
          <p className="text-2xl font-bold text-white">${summary?.totalSales.toFixed(2) ?? '0.00'}</p>
        </div>
        <div className="p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-red-400" />
            <span className="text-[10px] text-gray-400 uppercase">Platform Fees</span>
          </div>
          <p className="text-2xl font-bold text-white">${summary?.totalFees.toFixed(2) ?? '0.00'}</p>
        </div>
      </div>

      {/* Earnings Table */}
      <h2 className="text-sm font-bold text-white uppercase mb-4">Per-Sale Breakdown</h2>
      {earnings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <BarChart3 className="w-8 h-8 text-gray-600 mb-3" />
          <p className="text-gray-500 text-xs uppercase">No sales yet</p>
          <p className="text-gray-600 text-[10px] mt-1">When customers buy from your listing, earnings will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {earnings.map(e => (
            <div
              key={e.id}
              className="flex items-center justify-between p-3"
              style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
            >
              <div>
                <p className="text-white text-sm font-bold">${e.saleAmount.toFixed(2)} sale</p>
                <p className="text-gray-500 text-[10px]">Order: {e.orderId.slice(0, 16)}...</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-sm font-bold">+${e.netAmount.toFixed(2)}</p>
                <p className="text-red-400 text-[10px]">-${e.platformFee.toFixed(2)} fee</p>
              </div>
              <span className="text-gray-500 text-[10px]">
                {new Date(e.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
