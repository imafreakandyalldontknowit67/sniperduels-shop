'use client'

import { useEffect, useState } from 'react'
import { Package, Tag, Truck, AlertTriangle, ShoppingCart, RefreshCw, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui'

interface Stats {
  catalog: { total: number; pending: number }
  vault: { deposited: number; listed: number; reserved: number }
  jobs: {
    deliveryQueued: number
    deliveryInTrade: number
    deliveryFailedToday: number
    soldToday: number
    depositSessionsActive: number
  }
}

export default function MarketplaceDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    setLoading(true)
    const res = await fetch('/api/admin/marketplace/stats')
    if (res.ok) setStats(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
    const iv = setInterval(fetchStats, 30_000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketplace Dashboard</h1>
          <p className="text-gray-400 mt-1">Live state of the item marketplace + bot worker queue.</p>
        </div>
        <Button variant="outline" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {!stats ? (
        <div className="text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card icon={<BookOpen />} label="Catalog items" value={stats.catalog.total} />
          <Card icon={<AlertTriangle />} label="Candidates pending" value={stats.catalog.pending}
                emphasize={stats.catalog.pending > 20} href="/admin/catalog" />
          <Card icon={<Package />} label="Vault: deposited" value={stats.vault.deposited} />
          <Card icon={<Tag />} label="Vault: listed" value={stats.vault.listed} />
          <Card icon={<Truck />} label="Vault: reserved (mid-trade)" value={stats.vault.reserved} />
          <Card icon={<Truck />} label="Delivery queued" value={stats.jobs.deliveryQueued}
                emphasize={stats.jobs.deliveryQueued > 5} />
          <Card icon={<Truck />} label="Delivery in trade" value={stats.jobs.deliveryInTrade} />
          <Card icon={<AlertTriangle />} label="Failed today" value={stats.jobs.deliveryFailedToday}
                emphasize={stats.jobs.deliveryFailedToday > 0} />
          <Card icon={<ShoppingCart />} label="Sold today" value={stats.jobs.soldToday} />
          <Card icon={<Package />} label="Active deposit sessions" value={stats.jobs.depositSessionsActive} />
        </div>
      )}
    </div>
  )
}

function Card({ icon, label, value, emphasize, href }: {
  icon: React.ReactNode; label: string; value: number;
  emphasize?: boolean; href?: string
}) {
  const inner = (
    <div className={`bg-zinc-900 border rounded-lg p-4 transition-colors ${
      emphasize ? 'border-yellow-700 bg-yellow-900/10' : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <span className="w-4 h-4">{icon}</span>
        {label}
      </div>
      <div className="text-3xl font-bold text-white mt-2">{value}</div>
    </div>
  )
  return href ? <a href={href}>{inner}</a> : inner
}
