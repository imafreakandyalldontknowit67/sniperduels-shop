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
  ShoppingCart,
  Users,
} from 'lucide-react'

interface FinanceData {
  deposits: {
    totalUserDeposits: number
    totalProcessingFees: number
    totalChargeAmount: number
    pandabaseFees: number
    depositProfit: number
    count: number
  }
  crypto: {
    totalDeposited: number
    completedCount: number
    payments: Array<{ id: number; amount: number; currency: string; status: string; date: string }>
  }
  platformSales: {
    revenue: number
    orderCount: number
  }
  vendorSales: {
    totalSales: number
    platformFees: number
    vendorEarnings: number
    saleCount: number
    balancesOwed: number
    pendingPayoutCount: number
  }
  profitSummary: {
    depositProfit: number
    vendorPlatformFees: number
    platformSalesRevenue: number
    cryptoDeposits: number
  }
  payouts: {
    items: Array<{ id: string; amount: number; fee: number; status: string; date: string }>
    totalCompleted: number
    totalPending: number
    totalFees: number
  }
  dailyRevenue: Array<{ date: string; revenue: number; orders: number }>
  recentTransactions: Array<{ id: string; type: string; userId: string; amount: number; description: string; createdAt: string }>
  pandabaseRaw: {
    gross: number; net: number; fees: number; refunded: number
    completedOrders: number; pendingOrders: number
  } | null
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

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

  const dep = data?.deposits
  const vs = data?.vendorSales
  const ps = data?.platformSales
  const pb = data?.pandabaseRaw

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

      {/* ═══ PROFIT SOURCES ═══ */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Profit Sources</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Deposit Fee Profit"
          value={`$${fmt(dep?.depositProfit ?? 0)}`}
          sub={`Charged ${fmt(dep?.totalProcessingFees ?? 0)} in fees, Pandabase took ${fmt(dep?.pandabaseFees ?? 0)}`}
          icon={Percent}
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <StatCard
          label="Vendor Platform Fees"
          value={`$${fmt(vs?.platformFees ?? 0)}`}
          sub={`3% of $${fmt(vs?.totalSales ?? 0)} vendor sales (${vs?.saleCount ?? 0} orders)`}
          icon={Users}
          color="text-purple-400"
          bg="bg-purple-500/10"
        />
        <StatCard
          label="Platform Sales"
          value={`$${fmt(ps?.revenue ?? 0)}`}
          sub={`${ps?.orderCount ?? 0} orders from our own stock (includes COGS)`}
          icon={ShoppingCart}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
      </div>

      {/* ═══ MONEY FLOW ═══ */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Money Flow</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Fiat Deposited"
          value={`$${fmt(dep?.totalChargeAmount ?? 0)}`}
          sub={`${dep?.count ?? 0} deposits (users paid this to Pandabase)`}
          icon={DollarSign}
          color="text-gray-300"
          bg="bg-gray-500/10"
        />
        <StatCard
          label="User Wallet Credits"
          value={`$${fmt(dep?.totalUserDeposits ?? 0)}`}
          sub="What went into user wallets"
          icon={Wallet}
          color="text-gray-300"
          bg="bg-gray-500/10"
        />
        <StatCard
          label="Crypto Deposited"
          value={`$${fmt(data?.crypto.totalDeposited ?? 0)}`}
          sub={`${data?.crypto.completedCount ?? 0} crypto payments (no fees)`}
          icon={Bitcoin}
          color="text-cyan-400"
          bg="bg-cyan-500/10"
        />
        <StatCard
          label="Pandabase Fees Paid"
          value={`-$${fmt(dep?.pandabaseFees ?? 0)}`}
          sub="5.9% + $0.30 per fiat deposit"
          icon={Percent}
          color="text-red-400"
          bg="bg-red-500/10"
        />
      </div>

      {/* ═══ BANK PAYOUTS + BALANCES ═══ */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Bank & Balances</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Received in Bank"
          value={`$${fmt(data?.payouts.totalCompleted ?? 0)}`}
          sub={`${data?.payouts.items.filter(p => p.status === 'COMPLETED').length ?? 0} completed payouts`}
          icon={Landmark}
          color="text-green-400"
          bg="bg-green-500/10"
        />
        <StatCard
          label="Pending Payout"
          value={`$${fmt(data?.payouts.totalPending ?? 0)}`}
          sub="Awaiting review from Pandabase"
          icon={Landmark}
          color="text-yellow-400"
          bg="bg-yellow-500/10"
        />
        <StatCard
          label="Vendor Balances Owed"
          value={`$${fmt(vs?.balancesOwed ?? 0)}`}
          sub={`${vs?.pendingPayoutCount ?? 0} payout requests pending`}
          icon={ArrowDownUp}
          color="text-orange-400"
          bg="bg-orange-500/10"
        />
      </div>

      {/* ═══ Daily Revenue Chart ═══ */}
      {data?.dailyRevenue && data.dailyRevenue.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Daily Deposit Volume (Pandabase)</h2>
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
                    {d.date}: ${fmt(d.revenue)} ({d.orders} orders)
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* ═══ Bank Payouts Table ═══ */}
      {data?.payouts && data.payouts.items.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Landmark className="w-5 h-5 text-accent" />
            Bank Payouts
          </h2>
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
                  <td className="py-3 text-white font-medium">${fmt(p.amount)}</td>
                  <td className="py-3 text-gray-400">${fmt(p.fee)}</td>
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

      {/* ═══ Crypto Payments ═══ */}
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
                    <td className="py-3 text-white font-medium">${fmt(p.amount)}</td>
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

      {/* ═══ Vendor Payouts ═══ */}
      {vendorPayouts.length > 0 && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Pending Vendor Payouts ({vendorPayouts.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-dark-700">
                  <th className="text-left pb-3">Vendor</th>
                  <th className="text-left pb-3">Amount</th>
                  <th className="text-left pb-3">Method</th>
                  <th className="text-left pb-3">Requested</th>
                  <th className="text-right pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendorPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-dark-700/50">
                    <td className="py-3 text-white">{payout.vendorName}</td>
                    <td className="py-3 text-green-400 font-semibold">${fmt(payout.amount)}</td>
                    <td className="py-3 text-gray-300 text-sm max-w-[200px] truncate">{payout.paymentMethod}</td>
                    <td className="py-3 text-gray-400 text-sm">{new Date(payout.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handlePayoutAction(payout.id, 'complete')} disabled={actionLoading === payout.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-sm disabled:opacity-50">
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => handlePayoutAction(payout.id, 'reject')} disabled={actionLoading === payout.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm disabled:opacity-50">
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

      {/* ═══ Recent Transactions ═══ */}
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
                <div className="text-white font-semibold ml-4">${fmt(tx.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Pandabase Raw (debug) ═══ */}
      {pb && (
        <div className="mt-8 bg-dark-800/30 rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase mb-2">Pandabase Raw Data (for verification)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-gray-500">Gross:</span> <span className="text-gray-300">${fmt(pb.gross)}</span></div>
            <div><span className="text-gray-500">Net:</span> <span className="text-gray-300">${fmt(pb.net)}</span></div>
            <div><span className="text-gray-500">Fees:</span> <span className="text-gray-300">${fmt(pb.fees)}</span></div>
            <div><span className="text-gray-500">Refunded:</span> <span className="text-gray-300">${fmt(pb.refunded)}</span></div>
            <div><span className="text-gray-500">Completed:</span> <span className="text-gray-300">{pb.completedOrders}</span></div>
            <div><span className="text-gray-500">Pending:</span> <span className="text-gray-300">{pb.pendingOrders}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string; sub: string; icon: any; color: string; bg: string
}) {
  return (
    <div className="bg-dark-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
      <div className="text-gray-500 text-xs mt-1">{sub}</div>
    </div>
  )
}
