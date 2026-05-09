'use client'

import { useState, useEffect } from 'react'
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Wrench,
  X,
} from 'lucide-react'

interface Row {
  userId: string
  name: string
  isVendor: boolean
  walletBalance: number
  netEarnings: number
  deposits: number
  refunds: number
  referralCommissions: number
  purchases: number
  completedPayouts: number
  pendingPayouts: number
  expected: number
  actual: number
  delta: number
  vendorEarningCount: number
  lastActivityAt: string | null
}

interface Result {
  summary: { totalUsers: number; mismatchCount: number; totalAbsDelta: number; totalSignedDelta: number }
  rows: Row[]
  generatedAt: string
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AdminReconcilePage() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [fixModal, setFixModal] = useState<Row | null>(null)
  const [reason, setReason] = useState('')
  const [fixing, setFixing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  async function run() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reconcile', { cache: 'no-store' })
      if (res.ok) setResult(await res.json())
      else setToast({ type: 'error', text: 'Reconcile failed' })
    } catch {
      setToast({ type: 'error', text: 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  async function applyFix() {
    if (!fixModal) return
    if (reason.trim().length < 5) { setToast({ type: 'error', text: 'Reason min 5 chars' }); return }
    setFixing(true)
    try {
      const res = await fetch('/api/admin/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: fixModal.userId, action: 'fix', reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setToast({ type: 'error', text: data.error || 'Fix failed' }); return }
      setToast({ type: 'success', text: `${fixModal.name}: $${fmt(data.previous)} → $${fmt(data.current)}` })
      setFixModal(null)
      setReason('')
      await run()
    } catch {
      setToast({ type: 'error', text: 'Network error' })
    } finally {
      setFixing(false)
    }
  }

  const mismatches = result ? result.rows.filter(r => Math.abs(r.delta) >= 0.01) : []
  const display = showAll ? result?.rows ?? [] : mismatches

  return (
    <div>
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 text-xs uppercase max-w-md"
          style={{
            background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `2px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: toast.type === 'success' ? '#4ade80' : '#f87171',
          }}
        >
          {toast.text}
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <Scale className="w-7 h-7 text-accent" />
        <h1 className="text-2xl font-bold text-white uppercase">Wallet Reconciliation</h1>
      </div>
      <p className="text-gray-400 text-xs mb-6">
        Compares every user&apos;s wallet against `vendor earnings + deposits + refunds + referrals − purchases − payouts`. Flags any mismatch. Fix sets wallet to expected and writes a logged admin_adjust ledger row.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase disabled:opacity-50"
          style={{ background: '#e1ad2d', color: '#1a1a1e' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? 'Running...' : result ? 'Re-run' : 'Run Reconciliation'}
        </button>
        {result && (
          <span className="text-xs text-gray-500">Last run: {new Date(result.generatedAt).toLocaleString()}</span>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Card label="Active Users" value={String(result.summary.totalUsers)} icon={Scale} color="text-gray-300" bg="bg-gray-500/10" />
            <Card
              label="Mismatches"
              value={String(result.summary.mismatchCount)}
              icon={result.summary.mismatchCount === 0 ? CheckCircle2 : AlertTriangle}
              color={result.summary.mismatchCount === 0 ? 'text-green-400' : 'text-orange-400'}
              bg={result.summary.mismatchCount === 0 ? 'bg-green-500/10' : 'bg-orange-500/10'}
            />
            <Card
              label="Total |Δ|"
              value={`$${fmt(result.summary.totalAbsDelta)}`}
              icon={AlertTriangle}
              color={result.summary.totalAbsDelta > 0 ? 'text-orange-400' : 'text-green-400'}
              bg={result.summary.totalAbsDelta > 0 ? 'bg-orange-500/10' : 'bg-green-500/10'}
              sub={`Net signed: $${fmt(result.summary.totalSignedDelta)}`}
            />
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm uppercase text-gray-400">
              {showAll ? `All ${result.rows.length} users` : `${mismatches.length} mismatch${mismatches.length === 1 ? '' : 'es'}`}
            </h2>
            <label className="flex items-center gap-2 text-[10px] uppercase text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                className="accent-accent"
              />
              Show all (incl. matched)
            </label>
          </div>

          {display.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">
              {showAll ? 'No active users.' : '✓ All wallets match. Nothing to fix.'}
            </p>
          ) : (
            <div className="overflow-x-auto" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-[10px] uppercase border-b border-dark-700">
                    <th className="text-left p-3">User</th>
                    <th className="text-right p-3">Expected</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">Δ</th>
                    <th className="text-right p-3">Earnings</th>
                    <th className="text-right p-3">Sales</th>
                    <th className="text-right p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {display.map(r => {
                    const ok = Math.abs(r.delta) < 0.01
                    return (
                      <tr key={r.userId} className="border-b border-dark-700/50">
                        <td className="p-3">
                          <div className="text-white text-sm">{r.name}</div>
                          <div className="text-gray-500 text-[10px]">{r.userId}{r.isVendor && ' · VENDOR'}</div>
                        </td>
                        <td className="p-3 text-right text-gray-300">${fmt(r.expected)}</td>
                        <td className="p-3 text-right text-gray-300">${fmt(r.actual)}</td>
                        <td className={`p-3 text-right font-semibold ${ok ? 'text-green-400' : r.delta > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                          {ok ? '✓' : `${r.delta > 0 ? '+' : ''}$${fmt(r.delta)}`}
                        </td>
                        <td className="p-3 text-right text-purple-400">${fmt(r.netEarnings)}</td>
                        <td className="p-3 text-right text-gray-400">{r.vendorEarningCount}</td>
                        <td className="p-3 text-right">
                          {!ok && (
                            <button
                              onClick={() => { setFixModal(r); setReason('') }}
                              className="px-2 py-1 text-[10px] uppercase bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                            >
                              <Wrench className="w-3 h-3 inline mr-1" /> Fix
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {fixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !fixing && setFixModal(null)}>
          <div
            className="max-w-md w-full p-6"
            style={{ background: '#1a1a1e', border: '2px solid #e67e22' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white uppercase">Fix Wallet</h2>
              <button onClick={() => setFixModal(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm mb-5">
              <p className="text-gray-400 text-[10px] uppercase">Vendor</p>
              <p className="text-white">{fixModal.name} <span className="text-gray-500 text-xs">({fixModal.userId})</span></p>
              <p className="text-gray-400 text-[10px] uppercase mt-3">Change</p>
              <p className="text-orange-400 font-bold text-lg">${fmt(fixModal.actual)} → ${fmt(fixModal.expected)} <span className="text-sm text-gray-500">(delta ${fmt(fixModal.delta)})</span></p>
            </div>
            <div className="mb-5">
              <label className="text-[10px] uppercase text-gray-400 block mb-1">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Why this fix (min 5 chars)"
                rows={3}
                className="w-full px-3 py-2 text-sm text-white focus:outline-none resize-none"
                style={{ background: '#111', border: '2px solid #2a2a2e' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFixModal(null)}
                disabled={fixing}
                className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-white border border-dark-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={applyFix}
                disabled={fixing || reason.trim().length < 5}
                className="flex-1 px-4 py-2 text-sm font-bold uppercase disabled:opacity-30"
                style={{ background: '#e67e22', color: '#1a1a1e' }}
              >
                {fixing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Apply Fix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ label, value, sub, icon: Icon, color, bg }: { label: string; value: string; sub?: string; icon: any; color: string; bg: string }) {
  return (
    <div className="p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-gray-400 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-gray-500 text-[10px] mt-1">{sub}</p>}
    </div>
  )
}
