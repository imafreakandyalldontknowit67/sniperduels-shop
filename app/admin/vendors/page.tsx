'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, DollarSign, Package, Loader2, Percent, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, ArrowUpDown } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  displayName: string
  avatar?: string
  listing: {
    pricePerK: number
    stockK: number
    active: boolean
    platformFeeRate: number | null
  } | null
  earnings: {
    totalSales: number
    totalFees: number
    totalNet: number
    count: number
  }
  recent: {
    count30d: number
    gross30d: number
  }
}

interface SalesBucket {
  count: number
  gross: number
  fees: number
  net: number
}

interface VendorStats {
  sales: {
    today: SalesBucket
    week: SalesBucket
    month: SalesBucket
    allTime: SalesBucket
  }
  stock: {
    currentK: number
    active: boolean
    depositedLast7dK: number
    depositedLast30dK: number
    soldLast7dK: number
    soldLast30dK: number
    withdrawnLast7dK: number
    withdrawnLast30dK: number
    restockCount30d: number
    estDaysRemaining: number | null
  }
}

type SortKey = 'name' | 'revenue30d' | 'sales30d' | 'stock'

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [newUserId, setNewUserId] = useState('')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingFee, setEditingFee] = useState<string | null>(null)
  const [feeInput, setFeeInput] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState<Record<string, VendorStats>>({})
  const [statsLoading, setStatsLoading] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('revenue30d')

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

  async function fetchStats(vendorId: string) {
    if (stats[vendorId]) return // already cached
    setStatsLoading(vendorId)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/stats`)
      if (res.ok) {
        const data = await res.json()
        setStats(prev => ({ ...prev, [vendorId]: data }))
      }
    } catch {
      setToast({ type: 'error', text: 'Failed to load vendor stats' })
    } finally {
      setStatsLoading(null)
    }
  }

  function toggleExpand(vendorId: string) {
    if (expandedId === vendorId) {
      setExpandedId(null)
    } else {
      setExpandedId(vendorId)
      fetchStats(vendorId)
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

  async function handleFeeUpdate(vendorId: string) {
    const value = feeInput.trim()
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, platformFeeRate: value === '' ? null : value }),
      })
      if (res.ok) {
        setToast({ type: 'success', text: value === '' ? 'Fee reset to default 3%' : `Fee set to ${value}%` })
        fetchVendors()
      } else {
        const data = await res.json()
        setToast({ type: 'error', text: data.error || 'Failed to update fee' })
      }
    } catch {
      setToast({ type: 'error', text: 'Failed to update fee' })
    }
    setEditingFee(null)
  }

  const sortedVendors = [...vendors].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'revenue30d':
        return b.recent.gross30d - a.recent.gross30d
      case 'sales30d':
        return b.recent.count30d - a.recent.count30d
      case 'stock':
        return (b.listing?.stockK ?? 0) - (a.listing?.stockK ?? 0)
      default:
        return 0
    }
  })

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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white uppercase">Vendor Management</h1>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3 h-3 text-gray-500" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
            className="text-xs text-gray-400 bg-transparent border border-gray-700 px-2 py-1 focus:outline-none"
          >
            <option value="revenue30d">30d Revenue</option>
            <option value="sales30d">30d Sales</option>
            <option value="stock">Stock</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

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

      {/* Vendors List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      ) : vendors.length === 0 ? (
        <p className="text-gray-400 text-sm">No vendors yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {sortedVendors.map(vendor => (
            <div key={vendor.id}>
              {/* Vendor Row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                style={{ background: '#1a1a1e', border: '2px solid #2a2a2e', borderBottom: expandedId === vendor.id ? 'none' : undefined }}
                onClick={() => toggleExpand(vendor.id)}
              >
                <div className="flex items-center gap-4">
                  {expandedId === vendor.id
                    ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  }
                  {vendor.avatar && (
                    <img src={vendor.avatar} alt="" className="w-10 h-10 rounded" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-sm">{vendor.displayName}</p>
                      <a
                        href={`https://www.roblox.com/users/${vendor.id}/profile`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-500 hover:text-accent transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-gray-400 text-xs">@{vendor.name} &middot; ID: {vendor.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6" onClick={e => e.stopPropagation()}>
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
                        {editingFee === vendor.id ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={feeInput}
                            onChange={e => setFeeInput(e.target.value)}
                            onBlur={() => handleFeeUpdate(vendor.id)}
                            onKeyDown={e => { if (e.key === 'Enter') handleFeeUpdate(vendor.id); if (e.key === 'Escape') setEditingFee(null) }}
                            autoFocus
                            placeholder="3"
                            className="w-16 px-2 py-1 text-xs text-white text-right focus:outline-none"
                            style={{ background: '#111', border: '2px solid #3a3a3e' }}
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingFee(vendor.id); setFeeInput(vendor.listing?.platformFeeRate != null ? String(vendor.listing.platformFeeRate * 100) : '') }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            <Percent className="w-3 h-3" />
                            {vendor.listing?.platformFeeRate != null ? `${(vendor.listing.platformFeeRate * 100).toFixed(1)}%` : '3%'} fee
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <DollarSign className="w-3 h-3" />
                          ${vendor.recent.gross30d.toFixed(2)} / 30d
                        </div>
                        <p className="text-xs text-gray-500">{vendor.recent.count30d} sales &middot; ${vendor.earnings.totalNet.toFixed(2)} all</p>
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

              {/* Expanded Stats Panel */}
              {expandedId === vendor.id && (
                <div
                  className="p-5"
                  style={{ background: '#141418', border: '2px solid #2a2a2e', borderTop: '1px solid #2a2a2e' }}
                >
                  {statsLoading === vendor.id ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    </div>
                  ) : stats[vendor.id] ? (
                    <VendorStatsPanel stats={stats[vendor.id]} />
                  ) : (
                    <p className="text-gray-500 text-xs">No data available</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VendorStatsPanel({ stats }: { stats: VendorStats }) {
  const { sales, stock } = stats

  const withdrawalRatio30d = stock.soldLast30dK > 0
    ? Math.round((stock.withdrawnLast30dK / stock.soldLast30dK) * 100)
    : stock.withdrawnLast30dK > 0 ? 100 : 0
  const highWithdrawal = withdrawalRatio30d > 50

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Sales Volume */}
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Sales Volume</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left pb-2">Period</th>
              <th className="text-right pb-2">Sales</th>
              <th className="text-right pb-2">Gross</th>
              <th className="text-right pb-2">Fees</th>
              <th className="text-right pb-2">Net</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <SalesRow label="Today" data={sales.today} />
            <SalesRow label="7 Days" data={sales.week} />
            <SalesRow label="30 Days" data={sales.month} />
            <SalesRow label="All Time" data={sales.allTime} bold />
          </tbody>
        </table>
      </div>

      {/* Stock Turnover */}
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Stock Turnover</h3>
        <div className="space-y-2 text-xs">
          <StatLine label="Current Stock" value={`${stock.currentK}k`} color={stock.active ? 'text-accent' : 'text-gray-500'} />
          <StatLine label="Deposited (7d)" value={`${stock.depositedLast7dK}k`} />
          <StatLine label="Deposited (30d)" value={`${stock.depositedLast30dK}k`} />
          <div className="border-t border-gray-800 my-2" />
          <StatLine label="Sold (7d)" value={`${stock.soldLast7dK}k`} color="text-green-400" />
          <StatLine label="Sold (30d)" value={`${stock.soldLast30dK}k`} color="text-green-400" />
          <div className="border-t border-gray-800 my-2" />
          <StatLine
            label="Withdrawn (7d)"
            value={`${stock.withdrawnLast7dK}k`}
            color={stock.withdrawnLast7dK > 0 ? 'text-orange-400' : 'text-gray-400'}
          />
          <StatLine
            label="Withdrawn (30d)"
            value={`${stock.withdrawnLast30dK}k`}
            color={stock.withdrawnLast30dK > 0 ? 'text-orange-400' : 'text-gray-400'}
          />
          {withdrawalRatio30d > 0 && (
            <div className={`flex items-center gap-1 ${highWithdrawal ? 'text-red-400' : 'text-orange-400'}`}>
              {highWithdrawal && <AlertTriangle className="w-3 h-3" />}
              <span>Withdrawal/Sales ratio: {withdrawalRatio30d}%</span>
            </div>
          )}
          <div className="border-t border-gray-800 my-2" />
          <StatLine label="Restocks (30d)" value={`${stock.restockCount30d}`} />
          <StatLine
            label="Est. days remaining"
            value={stock.estDaysRemaining !== null ? `${stock.estDaysRemaining}d` : '—'}
            color={stock.estDaysRemaining !== null && stock.estDaysRemaining < 3 ? 'text-red-400' : 'text-gray-300'}
          />
        </div>
      </div>
    </div>
  )
}

function SalesRow({ label, data, bold }: { label: string; data: SalesBucket; bold?: boolean }) {
  const cls = bold ? 'font-bold text-white' : ''
  return (
    <tr className={`border-t border-gray-800/50 ${cls}`}>
      <td className="py-1.5 text-left">{label}</td>
      <td className="py-1.5 text-right">{data.count}</td>
      <td className="py-1.5 text-right">${data.gross.toFixed(2)}</td>
      <td className="py-1.5 text-right text-gray-500">${data.fees.toFixed(2)}</td>
      <td className="py-1.5 text-right text-green-400">${data.net.toFixed(2)}</td>
    </tr>
  )
}

function StatLine({ label, value, color = 'text-gray-300' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  )
}
