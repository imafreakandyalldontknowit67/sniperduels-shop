'use client'

import { useState, useEffect } from 'react'
import { MetricCard } from '@/components/admin/analytics/MetricCard'
import { DateRangeFilter } from '@/components/admin/analytics/DateRangeFilter'
import { Activity, Users, ShoppingCart, Gem, DollarSign, LogIn } from 'lucide-react'

interface TrendResult {
  label: string
  data: number[]
  count: number
  labels: string[]
}

export default function AnalyticsOverviewPage() {
  const [dateRange, setDateRange] = useState('-7d')
  const [loading, setLoading] = useState(true)
  const [trends, setTrends] = useState<TrendResult[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrends()
  }, [dateRange])

  async function fetchTrends() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics/trends?dateFrom=${dateRange}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to load')
        return
      }
      const data = await res.json()
      setTrends(data.result || [])
    } catch {
      setError('Failed to connect to analytics')
    } finally {
      setLoading(false)
    }
  }

  function getMetric(eventName: string): { total: number; data: number[]; trend: number } {
    const result = trends.find(t => t.label === eventName)
    if (!result) return { total: 0, data: [], trend: 0 }
    const data = result.data || []
    const total = result.count || data.reduce((a, b) => a + b, 0)
    const mid = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, mid).reduce((a, b) => a + b, 0) || 1
    const secondHalf = data.slice(mid).reduce((a, b) => a + b, 0)
    const trend = ((secondHalf - firstHalf) / firstHalf) * 100
    return { total, data, trend }
  }

  const pageviews = getMetric('$pageview')
  const itemPurchases = getMetric('item_purchased')
  const gemPurchases = getMetric('gems_purchased')
  const deposits = getMetric('deposit_initiated')
  const logins = getMetric('login_initiated')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase">Analytics</h1>
          <p className="text-gray-400 text-xs uppercase mt-1">Conversion metrics and trends</p>
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <MetricCard
              label="Page Views"
              value={pageviews.total.toLocaleString()}
              trend={pageviews.trend}
              sparkData={pageviews.data}
              color="#3b82f6"
            />
            <MetricCard
              label="Item Purchases"
              value={itemPurchases.total.toLocaleString()}
              trend={itemPurchases.trend}
              sparkData={itemPurchases.data}
              color="#22c55e"
            />
            <MetricCard
              label="Gem Purchases"
              value={gemPurchases.total.toLocaleString()}
              trend={gemPurchases.trend}
              sparkData={gemPurchases.data}
              color="#a855f7"
            />
            <MetricCard
              label="Deposits Initiated"
              value={deposits.total.toLocaleString()}
              trend={deposits.trend}
              sparkData={deposits.data}
              color="#eab308"
            />
            <MetricCard
              label="Login Attempts"
              value={logins.total.toLocaleString()}
              trend={logins.trend}
              sparkData={logins.data}
              color="#06b6d4"
            />
            <MetricCard
              label="Conversion Rate"
              value={pageviews.total > 0
                ? `${((itemPurchases.total + gemPurchases.total) / pageviews.total * 100).toFixed(1)}%`
                : '0%'}
              color="#22c55e"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-dark-800/50 rounded-xl p-6">
              <h3 className="text-sm font-bold text-white uppercase mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a href="/admin/analytics/funnels" className="flex items-center gap-3 p-3 bg-dark-700 hover:bg-dark-600 transition-colors">
                  <ShoppingCart className="w-4 h-4 text-accent" />
                  <span className="text-sm text-gray-300">Conversion Funnels</span>
                </a>
                <a href="/admin/analytics/dropoffs" className="flex items-center gap-3 p-3 bg-dark-700 hover:bg-dark-600 transition-colors">
                  <Activity className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-gray-300">Drop-off Analysis</span>
                </a>
              </div>
            </div>

            <div className="bg-dark-800/50 rounded-xl p-6">
              <h3 className="text-sm font-bold text-white uppercase mb-4">Event Summary</h3>
              <div className="space-y-3">
                {[
                  { icon: Users, label: 'Page Views', count: pageviews.total, color: 'text-blue-400' },
                  { icon: LogIn, label: 'Logins', count: logins.total, color: 'text-cyan-400' },
                  { icon: ShoppingCart, label: 'Item Purchases', count: itemPurchases.total, color: 'text-green-400' },
                  { icon: Gem, label: 'Gem Purchases', count: gemPurchases.total, color: 'text-purple-400' },
                  { icon: DollarSign, label: 'Deposits', count: deposits.total, color: 'text-yellow-400' },
                ].map(({ icon: Icon, label, count, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs text-gray-400 uppercase">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
