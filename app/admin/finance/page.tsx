'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  Clock,
  ArrowDownUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'

interface FinanceStats {
  totalDeposits: number
  totalProcessingFees: number
  totalPlatformFees: number
  totalVendorEarnings: number
  vendorPayoutsOwed: number
  pendingPayoutCount: number
  netRevenue: number
  orderCount: number
  depositCount: number
}

interface LedgerEntry {
  id: string
  type: string
  userId: string
  amount: number
  description: string
  relatedId?: string
  createdAt: string
}

interface PendingPayout {
  id: string
  vendorId: string
  vendorName: string
  amount: number
  paymentMethod: string
  createdAt: string
}

type Period = 'today' | 'week' | 'month' | 'all'

export default function FinancePage() {
  const [stats, setStats] = useState<FinanceStats | null>(null)
  const [transactions, setTransactions] = useState<LedgerEntry[]>([])
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([])
  const [period, setPeriod] = useState<Period>('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    setLoading(true)
    try {
      const [financeRes, payoutsRes] = await Promise.all([
        fetch(`/api/admin/finance?period=${period}`),
        fetch('/api/admin/finance/payouts'),
      ])
      if (financeRes.ok) {
        const data = await financeRes.json()
        setStats(data.stats)
        setTransactions(data.recentTransactions)
      }
      if (payoutsRes.ok) {
        const data = await payoutsRes.json()
        setPendingPayouts(data.pending)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handlePayoutAction(id: string, action: 'complete' | 'reject') {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/finance/payouts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch { /* ignore */ }
    setActionLoading(null)
  }

  const periodButtons: { label: string; value: Period }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'All Time', value: 'all' },
  ]

  const typeColors: Record<string, string> = {
    deposit: 'text-green-400',
    purchase: 'text-blue-400',
    vendor_earning: 'text-purple-400',
    vendor_payout: 'text-orange-400',
    refund: 'text-red-400',
  }

  const typeLabels: Record<string, string> = {
    deposit: 'Deposit',
    purchase: 'Purchase',
    vendor_earning: 'Vendor Earning',
    vendor_payout: 'Vendor Payout',
    refund: 'Refund',
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  const statsCards = stats ? [
    {
      label: 'Total Deposits',
      value: `$${stats.totalDeposits.toFixed(2)}`,
      sub: `${stats.depositCount} deposits`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Processing Fees (7% + $0.35)',
      value: `$${stats.totalProcessingFees.toFixed(2)}`,
      sub: 'From fiat deposits',
      icon: Percent,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Platform Fees (3%)',
      value: `$${stats.totalPlatformFees.toFixed(2)}`,
      sub: 'From vendor sales',
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Net Revenue',
      value: `$${stats.netRevenue.toFixed(2)}`,
      sub: 'Processing + Platform fees',
      icon: Wallet,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Vendor Balances Owed',
      value: `$${stats.vendorPayoutsOwed.toFixed(2)}`,
      sub: 'Total vendor wallet balances',
      icon: ArrowDownUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Pending Payouts',
      value: stats.pendingPayoutCount,
      sub: 'Awaiting approval',
      icon: Clock,
      color: stats.pendingPayoutCount > 0 ? 'text-yellow-500' : 'text-gray-500',
      bgColor: stats.pendingPayoutCount > 0 ? 'bg-yellow-500/10' : 'bg-gray-500/10',
    },
  ] : []

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Finance</h1>

      {/* Period Filter */}
      <div className="flex gap-2 mb-6">
        {periodButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setPeriod(btn.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === btn.value
                ? 'bg-accent text-dark-900'
                : 'bg-dark-800 text-gray-400 hover:text-white'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-dark-800/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
              {stat.sub && <div className="text-gray-500 text-xs mt-1">{stat.sub}</div>}
            </div>
          )
        })}
      </div>

      {/* Pending Payouts */}
      {pendingPayouts.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Pending Payouts ({pendingPayouts.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-dark-700">
                  <th className="text-left pb-3">Vendor</th>
                  <th className="text-left pb-3">Amount</th>
                  <th className="text-left pb-3">Payment Method</th>
                  <th className="text-left pb-3">Requested</th>
                  <th className="text-right pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-dark-700/50">
                    <td className="py-3 text-white">{payout.vendorName}</td>
                    <td className="py-3 text-green-400 font-semibold">${payout.amount.toFixed(2)}</td>
                    <td className="py-3 text-gray-300 text-sm max-w-[200px] truncate">{payout.paymentMethod}</td>
                    <td className="py-3 text-gray-400 text-sm">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handlePayoutAction(payout.id, 'complete')}
                          disabled={actionLoading === payout.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handlePayoutAction(payout.id, 'reject')}
                          disabled={actionLoading === payout.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-dark-800/50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-dark-700/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeColors[tx.type] || 'text-gray-400'} bg-dark-700`}>
                      {typeLabels[tx.type] || tx.type}
                    </span>
                    <span className="text-gray-300 text-sm">{tx.description}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(tx.createdAt).toLocaleString()} · User: {tx.userId}
                  </div>
                </div>
                <div className="text-white font-semibold ml-4">
                  ${tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
