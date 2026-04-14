'use client'

import { useState, useEffect } from 'react'
import { Share2, Users, DollarSign, CheckCircle2, Clock, Loader2 } from 'lucide-react'

interface Referral {
  id: string
  referrerName: string
  referredName: string
  status: string
  commission: number | null
  createdAt: string
  creditedAt: string | null
}

interface TopReferrer {
  name: string
  count: number
  earned: number
}

interface ReferralData {
  referrals: Referral[]
  topReferrers: TopReferrer[]
  totals: {
    totalReferrals: number
    totalCredited: number
    totalCommissionPaid: number
  }
}

export default function AdminReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/referrals')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-red-400 text-center mt-12">Failed to load referral data.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Referrals</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-dark-800/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="w-5 h-5 text-accent" />
            <span className="text-gray-400 text-sm">Total Referrals</span>
          </div>
          <p className="text-3xl font-bold text-white">{data.totals.totalReferrals}</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-gray-400 text-sm">Credited</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{data.totals.totalCredited}</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            <span className="text-gray-400 text-sm">Commission Paid</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">${data.totals.totalCommissionPaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Top Referrers */}
      {data.topReferrers.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Top Referrers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-dark-600">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium text-right">Referred</th>
                  <th className="pb-3 font-medium text-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {data.topReferrers.map((r, i) => (
                  <tr key={r.name} className="border-b border-dark-700/50">
                    <td className="py-3 text-gray-400">{i + 1}</td>
                    <td className="py-3 text-white font-medium">{r.name}</td>
                    <td className="py-3 text-gray-300 text-right">{r.count}</td>
                    <td className="py-3 text-green-400 text-right">${r.earned.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Referrals */}
      <div className="bg-dark-800/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">All Referrals</h2>
        {data.referrals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No referrals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-dark-600">
                  <th className="pb-3 font-medium">Referrer</th>
                  <th className="pb-3 font-medium">Referred</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Commission</th>
                  <th className="pb-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-dark-700/50">
                    <td className="py-3 text-white">{r.referrerName}</td>
                    <td className="py-3 text-gray-300">{r.referredName}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        r.status === 'credited'
                          ? 'bg-green-500/20 text-green-400'
                          : r.status === 'expired'
                          ? 'bg-gray-500/20 text-gray-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {r.status === 'credited' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 text-right text-green-400">
                      {r.commission !== null ? `$${r.commission.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 text-right text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
