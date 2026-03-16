'use client'

import { useState, useEffect } from 'react'
import { DateRangeFilter } from '@/components/admin/analytics/DateRangeFilter'
import { AlertTriangle } from 'lucide-react'

interface PageDropoff {
  url: string
  exits: number
}

export default function DropoffsPage() {
  const [dateRange, setDateRange] = useState('-7d')
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<PageDropoff[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDropoffs()
  }, [dateRange])

  async function fetchDropoffs() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics/dropoffs?dateFrom=${dateRange}`)
      if (!res.ok) {
        setError('Failed to load drop-off data')
        return
      }
      const data = await res.json()
      setPages(data.pages || [])
    } catch {
      setError('Failed to connect to analytics')
    } finally {
      setLoading(false)
    }
  }

  const totalExits = pages.reduce((sum, p) => sum + p.exits, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase">Drop-off Analysis</h1>
          <p className="text-gray-400 text-xs uppercase mt-1">Pages where users leave the site</p>
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
      ) : pages.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No drop-off data available yet.</p>
        </div>
      ) : (
        <div className="bg-dark-800/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left px-6 py-4 text-xs text-gray-400 uppercase font-medium">Page</th>
                <th className="text-right px-6 py-4 text-xs text-gray-400 uppercase font-medium">Exits</th>
                <th className="text-right px-6 py-4 text-xs text-gray-400 uppercase font-medium">% of Total</th>
                <th className="px-6 py-4 text-xs text-gray-400 uppercase font-medium w-48">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const pctOfTotal = totalExits > 0 ? (page.exits / totalExits) * 100 : 0
                const isHighExitRate = pctOfTotal > 30

                return (
                  <tr key={page.url} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {isHighExitRate && <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <span className="text-sm text-white font-mono">{page.url}</span>
                      </div>
                    </td>
                    <td className="text-right px-6 py-3">
                      <span className="text-sm text-white font-bold">{page.exits.toLocaleString()}</span>
                    </td>
                    <td className="text-right px-6 py-3">
                      <span className={`text-sm font-medium ${isHighExitRate ? 'text-red-400' : 'text-gray-300'}`}>
                        {pctOfTotal.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="h-3 bg-dark-700 relative overflow-hidden">
                        <div
                          className="h-full"
                          style={{
                            width: `${pctOfTotal}%`,
                            background: isHighExitRate ? '#ef4444' : '#e1ad2d',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
