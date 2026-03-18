'use client'

import { useState, useEffect } from 'react'
import { Package, DollarSign, TrendingUp, Save, Loader2 } from 'lucide-react'

interface Listing {
  id: string
  pricePerK: number
  minOrderK: number
  maxOrderK: number
  stockK: number
  bulkTiers: Array<{ minK: number; pricePerK: number }> | null
  active: boolean
}

interface Summary {
  totalSales: number
  totalFees: number
  totalNet: number
  count: number
}

export default function VendorDashboard() {
  const [listing, setListing] = useState<Listing | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [pricePerK, setPricePerK] = useState('2.90')
  const [minOrderK, setMinOrderK] = useState('1')
  const [maxOrderK, setMaxOrderK] = useState('500')
  const [active, setActive] = useState(true)

  useEffect(() => {
    Promise.all([fetchListing(), fetchEarnings()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchListing() {
    try {
      const res = await fetch('/api/vendor/listings')
      if (res.ok) {
        const data = await res.json()
        if (data.listing) {
          setListing(data.listing)
          setPricePerK(data.listing.pricePerK.toString())
          setMinOrderK(data.listing.minOrderK.toString())
          setMaxOrderK(data.listing.maxOrderK.toString())
          setActive(data.listing.active)
        }
      }
    } catch { /* ignore */ }
  }

  async function fetchEarnings() {
    try {
      const res = await fetch('/api/vendor/earnings')
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
      }
    } catch { /* ignore */ }
  }

  async function handleSaveListing(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/vendor/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricePerK: parseFloat(pricePerK),
          minOrderK: parseInt(minOrderK),
          maxOrderK: parseInt(maxOrderK),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', text: data.error })
        return
      }
      setListing(data.listing)
      setToast({ type: 'success', text: 'Listing updated' })
    } catch {
      setToast({ type: 'error', text: 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive() {
    try {
      const res = await fetch('/api/vendor/listings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      if (res.ok) {
        const data = await res.json()
        setActive(data.listing.active)
        setListing(data.listing)
        setToast({ type: 'success', text: data.listing.active ? 'Listing activated' : 'Listing paused' })
      }
    } catch {
      setToast({ type: 'error', text: 'Failed to toggle' })
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
          className="fixed top-4 right-4 z-50 px-4 py-3 text-xs uppercase"
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
      <h1 className="text-2xl font-bold text-white mb-2 uppercase">Vendor Overview</h1>
      <p className="text-gray-400 text-xs mb-8">Manage your gem listing and track performance</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-accent" />
            <span className="text-[10px] text-gray-400 uppercase">Stock</span>
          </div>
          <p className="text-2xl font-bold text-white">{listing?.stockK ?? 0}k</p>
        </div>
        <div className="p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-[10px] text-gray-400 uppercase">Total Earned</span>
          </div>
          <p className="text-2xl font-bold text-white">${summary?.totalNet.toFixed(2) ?? '0.00'}</p>
        </div>
        <div className="p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] text-gray-400 uppercase">Sales</span>
          </div>
          <p className="text-2xl font-bold text-white">{summary?.count ?? 0}</p>
        </div>
      </div>

      {/* Listing Settings */}
      <div className="p-6" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase">Gem Listing</h2>
          {listing && (
            <button
              onClick={handleToggleActive}
              className="px-3 py-1 text-[10px] uppercase font-bold cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background: active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                border: `2px solid ${active ? '#22c55e' : '#ef4444'}`,
                color: active ? '#4ade80' : '#f87171',
              }}
            >
              {active ? 'Active' : 'Paused'}
            </button>
          )}
        </div>

        <form onSubmit={handleSaveListing} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Price per 1k</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={pricePerK}
                  onChange={e => setPricePerK(e.target.value)}
                  step="0.01"
                  min="0.01"
                  max="100"
                  className="w-full pl-7 pr-3 py-2 text-sm text-white focus:outline-none"
                  style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Min Order (k)</label>
              <input
                type="number"
                value={minOrderK}
                onChange={e => setMinOrderK(e.target.value)}
                min="1"
                max="500"
                className="w-full px-3 py-2 text-sm text-white focus:outline-none"
                style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Max Order (k)</label>
              <input
                type="number"
                value={maxOrderK}
                onChange={e => setMaxOrderK(e.target.value)}
                min="1"
                max="500"
                className="w-full px-3 py-2 text-sm text-white focus:outline-none"
                style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[44px] w-auto" style={{ imageRendering: 'pixelated' }} />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] uppercase tracking-wider gap-1">
              <Save className="w-3 h-3" />
              {saving ? 'Saving...' : 'Save Listing'}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
