'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, DollarSign, Package, Loader2 } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  displayName: string
  avatar?: string
  listing: {
    pricePerK: number
    stockK: number
    active: boolean
  } | null
  earnings: {
    totalSales: number
    totalFees: number
    totalNet: number
    count: number
  }
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [newUserId, setNewUserId] = useState('')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchVendors() {
    try {
      const res = await fetch('/api/admin/vendors')
      if (res.ok) {
        const data = await res.json()
        setVendors(data.vendors)
      }
    } catch {
      setToast({ type: 'error', text: 'Failed to load vendors' })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault()
    if (!newUserId.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newUserId.trim(), action: 'add' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', text: data.error || 'Failed to add vendor' })
        return
      }
      setToast({ type: 'success', text: `${data.user.name} is now a vendor` })
      setNewUserId('')
      fetchVendors()
    } catch {
      setToast({ type: 'error', text: 'Failed to add vendor' })
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveVendor(userId: string, name: string) {
    if (!confirm(`Remove ${name} as a vendor?`)) return
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'remove' }),
      })
      if (res.ok) {
        setToast({ type: 'success', text: `${name} removed as vendor` })
        fetchVendors()
      }
    } catch {
      setToast({ type: 'error', text: 'Failed to remove vendor' })
    }
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

      <h1 className="text-2xl font-bold text-white mb-6 uppercase">Vendor Management</h1>

      {/* Add Vendor Form */}
      <form onSubmit={handleAddVendor} className="flex gap-3 mb-8">
        <input
          type="text"
          value={newUserId}
          onChange={e => setNewUserId(e.target.value)}
          placeholder="Roblox User ID"
          className="flex-1 max-w-xs px-4 py-2 text-sm text-white focus:outline-none"
          style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
        />
        <button
          type="submit"
          disabled={adding || !newUserId.trim()}
          className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[44px] w-auto" style={{ imageRendering: 'pixelated' }} />
          <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] uppercase tracking-wider gap-1">
            <UserPlus className="w-3 h-3" />
            {adding ? 'Adding...' : 'Add Vendor'}
          </span>
        </button>
      </form>

      {/* Vendors Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : vendors.length === 0 ? (
        <p className="text-gray-400 text-sm">No vendors yet. Add one above.</p>
      ) : (
        <div className="space-y-3">
          {vendors.map(vendor => (
            <div
              key={vendor.id}
              className="flex items-center justify-between p-4"
              style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
            >
              <div className="flex items-center gap-4">
                {vendor.avatar && (
                  <img src={vendor.avatar} alt="" className="w-10 h-10 rounded" />
                )}
                <div>
                  <p className="text-white font-bold text-sm">{vendor.displayName}</p>
                  <p className="text-gray-400 text-xs">@{vendor.name} &middot; ID: {vendor.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {vendor.listing ? (
                  <>
                    <div className="text-right">
                      <p className="text-accent text-sm font-bold">${vendor.listing.pricePerK.toFixed(2)}/k</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Package className="w-3 h-3" />
                        {vendor.listing.stockK}k stock
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <DollarSign className="w-3 h-3" />
                        ${vendor.earnings.totalNet.toFixed(2)} earned
                      </div>
                      <p className="text-xs text-gray-500">{vendor.earnings.count} sales</p>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-xs uppercase">No listing yet</p>
                )}
                <button
                  onClick={() => handleRemoveVendor(vendor.id, vendor.name)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
