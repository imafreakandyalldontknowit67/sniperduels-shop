'use client'

import { useState, useEffect } from 'react'
import { FunnelChart } from '@/components/admin/analytics/FunnelChart'
import { DateRangeFilter } from '@/components/admin/analytics/DateRangeFilter'

interface FunnelStep {
  label: string
  count: number
}

export default function FunnelsPage() {
  const [dateRange, setDateRange] = useState('-7d')
  const [loading, setLoading] = useState(true)
  const [itemFunnel, setItemFunnel] = useState<FunnelStep[]>([])
  const [gemFunnel, setGemFunnel] = useState<FunnelStep[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFunnels()
  }, [dateRange])

  async function fetchFunnels() {
    setLoading(true)
    setError(null)
    try {
      const [itemsRes, gemsRes] = await Promise.all([
        fetch(`/api/admin/analytics/funnel?dateFrom=${dateRange}&type=items`),
        fetch(`/api/admin/analytics/funnel?dateFrom=${dateRange}&type=gems`),
      ])

      if (!itemsRes.ok || !gemsRes.ok) {
        setError('Failed to load funnel data')
        return
      }

      const itemsData = await itemsRes.json()
      const gemsData = await gemsRes.json()

      const mapFunnel = (data: any, labels: string[]) => {
        const steps = data.result || []
        return labels.map((label, i) => ({
          label,
          count: steps[i]?.count || 0,
        }))
      }

      setItemFunnel(mapFunnel(itemsData, ['Page View', 'Buy Clicked', 'Purchased']))
      setGemFunnel(mapFunnel(gemsData, ['Page View', 'Buy Clicked', 'Purchased']))
    } catch {
      setError('Failed to connect to analytics')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase">Conversion Funnels</h1>
          <p className="text-gray-400 text-xs uppercase mt-1">Track where users drop off in the purchase flow</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error === 'Failed to connect to analytics'
            ? 'PostHog is not configured yet. Deploy PostHog and add your API keys to .env.local.'
            : error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-dark-800/50 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white uppercase mb-1">Items Purchase Funnel</h3>
            <p className="text-xs text-gray-500 mb-6">Page View → Buy Click → Purchase Complete</p>
            <FunnelChart steps={itemFunnel} />
          </div>

          <div className="bg-dark-800/50 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white uppercase mb-1">Gems Purchase Funnel</h3>
            <p className="text-xs text-gray-500 mb-6">Page View → Buy Click → Purchase Complete</p>
            <FunnelChart steps={gemFunnel} />
          </div>
        </div>
      )}
    </div>
  )
}
