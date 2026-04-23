'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  ArrowDownUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Landmark,
  Bitcoin,
  Clock,
} from 'lucide-react'

interface FinanceData {
  pandabase: {
    gross: number
    net: number
    fees: number
    refunded: number
    completedOrders: number
    pendingOrders: number
    totalOrders: number
    refundedOrders: number
    avgOrderValue: number
  } | null
  crypto: {
    totalDeposited: number
    completedCount: number
    payments: Array<{ id: number; amount: number; currency: string; status: string; date: string }>
  }
  combined: {
    totalFiatRevenue: number
    totalCryptoRevenue: number
    totalRevenue: number
    pandabaseFees: number
    netAfterFees: number
    vendorPlatformFees: number
  }
  vendors: {
    earnings: number
    platformFees: number
    balancesOwed: number
    pendingPayoutCount: number
  }
  payouts: {
    items: Array<{ id: string; amount: number; fee: number; status: string; date: string }>
    totalCompleted: number
    totalPending: number
    totalFees: number
  }
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>
  recentTransactions: Array<{ id: string; type: string; userId: string; amount: number; description: string; createdAt: string }>
}

interface PendingPayout {
  id: string
  vendorId: string
  vendorName: string
  amount: number
  paymentMethod: string
  createdAt: string
}

type Period = 'all' | '7d' | '30d' | '90d'

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [vendorPayouts, setVendorPayouts] = useState<PendingPayout[]>([])
  const [period, setPeriod] = useState<Period>('all')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [period])

  async function fetchData() {
    setLoading(true)
    try {
      const [financeRes, payoutsRes] = await Promise.all([
        fetch(`/api/admin/finance?period=${period}`),
        fetch('/api/admin/finance/payouts'),
      ])
      if (financeRes.ok) setData(await financeRes.json())
      if (payoutsRes.ok) {
        const p = await payoutsRes.json()
        setVendorPayouts(p.pending || [])
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
      if (res.ok) await fetchData()
    } catch { /* ignore */ }
    setActionLoading(null)
  }

  const periods: { label: string; value: Period }[] = [
    { label: 'All Time', value: 'all' },
    { label: '90 Days', value: '90d' },
    { label: '30 Days', value: '30d' },
    { label: '7 Days', value: '7d' },
  ]

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  const pb = data?.pandabase
  const combined = data?.combined

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Finance</h1>
        {loading && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 mb-6">
        {periods.map((btn) => (
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

      {/* === P&L Summary Cards === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Gross Revenue (Fiat)"
          value={`$${(pb?.gross ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub={`${pb?.completedOrders ?? 0} completed orders`}
          icon={DollarSign}
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <StatCard
          label="Pandabase Fees"
          value={`-$${(pb?.fees ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="5.9% + $0.30 per transaction"
          icon={Percent}
          color="text-red-400"
          bg="bg-red-500/10"
        />
        <StatCard
          label="Net Fiat Revenue"
          value={`$${(pb?.net ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="Gross minus Pandabase fees"
          icon={TrendingUp}
          color="text-accent"
          bg="bg-accent/10"
        />
        <StatCard
          label="Crypto Revenue"
          value={`$${(data?.crypto.totalDeposited ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub={`${data?.crypto.completedCount ?? 0} completed payments (no fees)`}
          icon={Bitcoin}
          color="text-cyan-400"
          bg="bg-cyan-500/10"
        />
        <StatCard
          label="Vendor Platform Fees"
          value={`$${(data?.vendors.platformFees ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="3% from vendor sales"
          icon={ArrowDownUp}
          color="text-purple-400"
          bg="bg-purple-500/10"
        />
        <StatCard
          label="Total Net Profit"
          value={`$${((combined?.netAfterFees ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub="Fiat net + crypto (all yours)"
          icon={Wallet}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          highlight
        />
      </div>

      {/* === Extra Stats Row === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MiniStat label="Avg Order Value" value={`$${(pb?.avgOrderValue ?? 0).toFixed(2)}`} />
        <MiniStat label="Refunded" value={`$${(pb?.refunded ?? 0).toFixed(2)} (${pb?.refundedOrders ?? 0})`} />
        <MiniStat label="Pending Orders" value={String(pb?.pendingOrders ?? 0)} />
        <MiniStat label="Vendor Balances Owed" value={`$${(data?.vendors.balancesOwed ?? 0).toFixed(2)}`} />
      </div>

      {/* === Daily Revenue Chart === */}
      {data?.dailyRevenue && data.dailyRevenue.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Daily Revenue</h2>
          <div className="flex items-end gap-1 h-40">
            {(() => {
              const maxRev = Math.max(...data.dailyRevenue.map(d => d.revenue), 1)
              return data.dailyRevenue.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-accent/60 hover:bg-accent rounded-t transition-colors min-h-[2px]"
                    style={{ height: `${(d.revenue / maxRev) * 100}%` }}
                  />
                  <span className="text-[9px] text-gray-500 hidden md:block">
                    {d.date.slice(5)}
                  </span>
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-dark-700 border border-dark-500 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                    {d.date}: ${d.revenue.toFixed(2)} ({d.orders} orders)
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* === Bank Payouts === */}
      {data?.payouts && data.payouts.items.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-accent" />
              Bank Payouts
            </h2>
            <div className="text-sm text-gray-400">
              Received: <span className="text-green-400 font-medium">${data.payouts.totalCompleted.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              {data.payouts.totalPending > 0 && (
                <> · Pending: <span className="text-yellow-400 font-medium">${data.payouts.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></>
              )}
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-dark-700">
                <th className="text-left pb-3">Amount</th>
                <th className="text-left pb-3">Fee</th>
                <th className="text-left pb-3">Status</th>
                <th className="text-left pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.payouts.items.map((p) => (
                <tr key={p.id} className="border-b border-dark-700/50">
                  <td className="py-3 text-white font-medium">${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 text-gray-400">${p.fee.toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded ${
                      p.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {p.status === 'COMPLETED' ? 'Received' : p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* === Crypto Payments === */}
      {data?.crypto && data.crypto.payments.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Bitcoin className="w-5 h-5 text-cyan-400" />
            Crypto Payments ({data.crypto.completedCount} completed)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-dark-700">
                  <th className="text-left pb-3">Amount</th>
                  <th className="text-left pb-3">Currency</th>
                  <th className="text-left pb-3">Status</th>
                  <th className="text-left pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.crypto.payments.map((p) => (
                  <tr key={p.id} className="border-b border-dark-700/50">
                    <td className="py-3 text-white font-medium">${p.amount.toFixed(2)}</td>
                    <td className="py-3 text-gray-300 text-sm uppercase">{p.currency}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        p.status === 'finished' || p.status === 'confirmed'
                          ? 'bg-green-500/10 text-green-400'
                          : p.status === 'expired' || p.status === 'failed'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === Vendor Payouts (from our DB) === */}
      {vendorPayouts.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Pending Vendor Payouts ({vendorPayouts.length})
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
                {vendorPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-dark-700/50">
                    <td className="py-3 text-white">{payout.vendorName}</td>
                    <td className="py-3 text-green-400 font-semibold">${payout.amount.toFixed(2)}</td>
                    <td className="py-3 text-gray-300 text-sm max-w-[200px] truncate">{payout.paymentMethod}</td>
                    <td className="py-3 text-gray-400 text-sm">{new Date(payout.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handlePayoutAction(payout.id, 'complete')}
                          disabled={actionLoading === payout.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handlePayoutAction(payout.id, 'reject')}
                          disabled={actionLoading === payout.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" /> Reject
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

      {/* === Recent Transactions === */}
      <div className="bg-dark-800/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
        {!data?.recentTransactions?.length ? (
          <p className="text-gray-500">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-dark-700/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded bg-dark-700 ${
                      tx.type === 'deposit' ? 'text-green-400'
                        : tx.type === 'purchase' ? 'text-blue-400'
                        : tx.type === 'vendor_earning' ? 'text-purple-400'
                        : tx.type === 'vendor_payout' ? 'text-orange-400'
                        : tx.type === 'refund' ? 'text-red-400'
                        : 'text-gray-400'
                    }`}>
                      {tx.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-300 text-sm">{tx.description}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {new Date(tx.createdAt).toLocaleString()} · User: {tx.userId}
                  </div>
                </div>
                <div className="text-white font-semibold ml-4">${tx.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, color, bg, highlight }: {
  label: string; value: string; sub: string; icon: any; color: string; bg: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl p-5 ${highlight ? 'bg-dark-800 border border-accent/30' : 'bg-dark-800/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold mb-1 ${highlight ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
      <div className="text-gray-500 text-xs mt-1">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-dark-800/30 rounded-lg p-4">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className="text-white font-semibold text-sm">{value}</div>
    </div>
  )
}
