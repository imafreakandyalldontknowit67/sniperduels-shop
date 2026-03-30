'use client'

import { useState, useEffect } from 'react'
import { Package, DollarSign, TrendingUp, Save, Loader2, Plus, Trash2 } from 'lucide-react'

interface BulkTier {
  minK: number
  pricePerK: number
}

interface Listing {
  id: string
  pricePerK: number
  minOrderK: number
  maxOrderK: number
  stockK: number
  bulkTiers: BulkTier[] | null
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
  const [bulkEnabled, setBulkEnabled] = useState(false)
  const [bulkTiers, setBulkTiers] = useState<Array<{ minK: string; pricePerK: string }>>([])

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
          if (data.listing.bulkTiers && data.listing.bulkTiers.length > 0) {
            setBulkEnabled(true)
            setBulkTiers(data.listing.bulkTiers.map((t: BulkTier) => ({
              minK: t.minK.toString(),
              pricePerK: t.pricePerK.toString(),
            })))
          }
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
      const payload: Record<string, unknown> = {
        pricePerK: parseFloat(pricePerK),
        minOrderK: parseInt(minOrderK),
        maxOrderK: parseInt(maxOrderK),
      }

      if (bulkEnabled && bulkTiers.length > 0) {
        payload.bulkTiers = bulkTiers.map(t => ({
          minK: parseInt(t.minK),
          pricePerK: parseFloat(t.pricePerK),
        }))
      } else {
        payload.bulkTiers = null
      }

      const res = await fetch('/api/vendor/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  function addBulkTier() {
    if (bulkTiers.length >= 10) return
    setBulkTiers([...bulkTiers, { minK: '100', pricePerK: '2.65' }])
  }

  function removeBulkTier(index: number) {
    setBulkTiers(bulkTiers.filter((_, i) => i !== index))
  }

  function updateBulkTier(index: number, field: 'minK' | 'pricePerK', value: string) {
    const updated = [...bulkTiers]
    updated[index] = { ...updated[index], [field]: value }
    setBulkTiers(updated)
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
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Base Price per 1k</label>
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

          {/* Bulk Pricing Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkEnabled}
                onChange={e => {
                  setBulkEnabled(e.target.checked)
                  if (e.target.checked && bulkTiers.length === 0) {
                    setBulkTiers([{ minK: '100', pricePerK: '2.65' }])
                  }
                }}
                className="w-4 h-4 rounded border-dark-500 text-accent focus:ring-accent bg-dark-600"
              />
              <span className="text-xs text-white uppercase font-bold">Enable Bulk Pricing</span>
              <span className="text-[10px] text-gray-500">(optional — offer discounts for larger orders)</span>
            </label>
          </div>

          {/* Bulk Tiers */}
          {bulkEnabled && (
            <div className="space-y-3 pt-2">
              <p className="text-[10px] text-gray-400 uppercase">
                Bulk tiers — customers ordering at or above the minimum get the discounted rate
              </p>
              {bulkTiers.map((tier, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 mb-1">Min {i === 0 ? '(k)' : ''}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={tier.minK}
                        onChange={e => updateBulkTier(i, 'minK', e.target.value)}
                        min="1"
                        max="500"
                        className="w-full px-3 py-2 text-sm text-white focus:outline-none"
                        style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">k+</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 mb-1">Price {i === 0 ? '(/k)' : ''}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={tier.pricePerK}
                        onChange={e => updateBulkTier(i, 'pricePerK', e.target.value)}
                        step="0.01"
                        min="0.01"
                        max="100"
                        className="w-full pl-7 pr-3 py-2 text-sm text-white focus:outline-none"
                        style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBulkTier(i)}
                    className="mt-4 p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {bulkTiers.length < 10 && (
                <button
                  type="button"
                  onClick={addBulkTier}
                  className="flex items-center gap-2 text-[10px] text-accent hover:text-accent-light uppercase font-bold transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Tier
                </button>
              )}
            </div>
          )}

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
