'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  Wallet,
  Banknote,
  History,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  X,
  ArrowRight,
} from 'lucide-react'

interface VendorSearchResult {
  id: string
  name: string
  displayName: string
  avatar?: string | null
  walletBalance: number
  isVendor: boolean
  discordUsername?: string | null
}

interface Payout {
  id: string
  vendorId: string
  amount: number
  paymentMethod: string
  status: 'pending' | 'completed' | 'rejected'
  adminNotes?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

interface VendorEarning {
  id: string
  vendorId: string
  orderId: string
  saleAmount: number
  platformFee: number
  netAmount: number
  createdAt: string
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

interface VendorFinance {
  user: {
    id: string
    name: string
    displayName: string
    avatar?: string | null
    isVendor: boolean
    discordUsername?: string | null
  }
  balance: number
  earningsSummary: {
    totalSales: number
    totalFees: number
    totalNet: number
    count: number
  }
  earnings: VendorEarning[]
  payouts: Payout[]
  purchases: number
  refunds: number
  reconciliation: {
    expected: number
    actual: number
    delta: number
    ok: boolean
    breakdown: {
      netEarnings: number
      refunds: number
      purchases: number
      completedPayouts: number
      pendingPayouts: number
    }
  }
  ledger: LedgerEntry[]
}

const PAYMENT_METHODS = ['PayPal', 'Cash App', 'Venmo', 'Zelle', 'LTC', 'BTC', 'ETH', 'SOL', 'USDT', 'Roblox Gems', 'Robux Gift Card', 'Other']

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Tab = 'payout' | 'history' | 'ledger'

export default function AdminWithdrawPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VendorSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [vendorsOnly, setVendorsOnly] = useState(true)
  const [selected, setSelected] = useState<VendorSearchResult | null>(null)
  const [finance, setFinance] = useState<VendorFinance | null>(null)
  const [financeLoading, setFinanceLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('payout')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('PayPal')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Pending payout actions
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Search debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/vendors/search?q=${encodeURIComponent(query)}&vendorsOnly=${vendorsOnly}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
        }
      } catch {
        setToast({ type: 'error', text: 'Search failed' })
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, vendorsOnly])

  const fetchFinance = useCallback(async (vendorId: string) => {
    setFinanceLoading(true)
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/finance`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setFinance(data)
      } else {
        setToast({ type: 'error', text: 'Failed to load vendor finance' })
      }
    } catch {
      setToast({ type: 'error', text: 'Network error loading vendor' })
    } finally {
      setFinanceLoading(false)
    }
  }, [])

  function selectVendor(v: VendorSearchResult) {
    setSelected(v)
    setQuery('')
    setResults([])
    setTab('payout')
    setAmount('')
    setReference('')
    setNotes('')
    fetchFinance(v.id)
  }

  function clearSelection() {
    setSelected(null)
    setFinance(null)
    setAmount('')
    setReference('')
    setNotes('')
  }

  async function handlePayout() {
    if (!selected || !finance) return
    const num = parseFloat(amount)
    if (!num || num <= 0) { setToast({ type: 'error', text: 'Amount must be > 0' }); return }
    if (num > finance.balance) { setToast({ type: 'error', text: 'Amount exceeds balance' }); return }
    if (notes.trim().length < 5) { setToast({ type: 'error', text: 'Notes required (min 5 chars)' }); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/payouts/admin-initiated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selected.id,
          amount: num,
          paymentMethod: method,
          reference: reference.trim(),
          notes: notes.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', text: data.error || 'Payout failed' })
        return
      }
      setToast({ type: 'success', text: `Paid out $${fmt(num)} to ${selected.name}. Balance now $${fmt(data.newBalance)}.` })
      setAmount('')
      setReference('')
      setNotes('')
      setConfirmOpen(false)
      await fetchFinance(selected.id)
      setTab('history')
    } catch {
      setToast({ type: 'error', text: 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePendingAction(payoutId: string, action: 'complete' | 'reject') {
    if (action === 'reject' && !confirm('Reject this payout? Wallet will be refunded.')) return
    setPendingActionId(payoutId)
    try {
      const res = await fetch(`/api/admin/finance/payouts/${payoutId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setToast({ type: 'success', text: action === 'complete' ? 'Marked complete' : 'Rejected & refunded' })
        if (selected) await fetchFinance(selected.id)
      } else {
        const data = await res.json()
        setToast({ type: 'error', text: data.error || 'Action failed' })
      }
    } catch {
      setToast({ type: 'error', text: 'Network error' })
    } finally {
      setPendingActionId(null)
    }
  }

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
        <Banknote className="w-7 h-7 text-accent" />
        <h1 className="text-2xl font-bold text-white uppercase">Pay Out Vendor</h1>
      </div>
      <p className="text-gray-400 text-xs mb-6">
        Send a vendor their earnings, deduct it from their wallet, and write the audit trail. Use this every time you pay a vendor offsite.
      </p>

      {/* Search */}
      {!selected && (
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, Roblox ID, or Discord username..."
              className="w-full pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none"
              style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}
              autoFocus
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />}
          </div>
          <label className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 uppercase cursor-pointer">
            <input
              type="checkbox"
              checked={vendorsOnly}
              onChange={e => setVendorsOnly(e.target.checked)}
              className="accent-accent"
            />
            Vendors only
          </label>

          {results.length > 0 && (
            <div className="mt-2 max-w-2xl" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => selectVendor(r)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] border-b border-dark-700/50 last:border-b-0 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {r.avatar && <img src={r.avatar} alt="" className="w-8 h-8 rounded shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{r.displayName}</p>
                      <p className="text-gray-500 text-[10px] truncate">@{r.name} · {r.id}{r.isVendor && ' · VENDOR'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-green-400 text-sm font-bold">${fmt(r.walletBalance)}</p>
                    <p className="text-gray-500 text-[10px] uppercase">wallet</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.trim() && !searching && results.length === 0 && (
            <p className="mt-3 text-gray-500 text-xs max-w-2xl">No matches. {vendorsOnly && 'Try unchecking "Vendors only".'}</p>
          )}
        </div>
      )}

      {/* Selected vendor view */}
      {selected && (
        <>
          {/* Vendor header */}
          <div className="flex items-center justify-between mb-4 p-4" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
            <div className="flex items-center gap-3 min-w-0">
              {selected.avatar && <img src={selected.avatar} alt="" className="w-12 h-12 rounded shrink-0" />}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold">{selected.displayName}</p>
                  <a
                    href={`https://www.roblox.com/users/${selected.id}/profile`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-accent"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-gray-400 text-xs">@{selected.name} · ID: {selected.id}{selected.discordUsername && ` · ${selected.discordUsername}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/vendors"
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                Vendor admin <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                onClick={clearSelection}
                className="p-2 text-gray-500 hover:text-white"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Balance + reconciliation cards */}
          {financeLoading && !finance ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
          ) : finance ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <Card label="Wallet Balance" value={`$${fmt(finance.balance)}`} icon={Wallet} color="text-green-400" bg="bg-green-500/10" />
                <Card label="Lifetime Earned (Net)" value={`$${fmt(finance.earningsSummary.totalNet)}`} icon={Receipt} color="text-purple-400" bg="bg-purple-500/10" sub={`${finance.earningsSummary.count} sales · $${fmt(finance.earningsSummary.totalFees)} platform fees`} />
                <Card
                  label="Reconciliation"
                  value={finance.reconciliation.ok ? '✓ Match' : `Δ $${fmt(finance.reconciliation.delta)}`}
                  icon={finance.reconciliation.ok ? CheckCircle2 : AlertTriangle}
                  color={finance.reconciliation.ok ? 'text-green-400' : 'text-orange-400'}
                  bg={finance.reconciliation.ok ? 'bg-green-500/10' : 'bg-orange-500/10'}
                  sub={`Expected $${fmt(finance.reconciliation.expected)}, actual $${fmt(finance.reconciliation.actual)}`}
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-dark-700">
                <TabBtn active={tab === 'payout'} onClick={() => setTab('payout')} icon={Banknote}>Pay Out</TabBtn>
                <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={History}>
                  Payout History ({finance.payouts.length})
                </TabBtn>
                <TabBtn active={tab === 'ledger'} onClick={() => setTab('ledger')} icon={Receipt}>
                  Earnings & Ledger
                </TabBtn>
              </div>

              {tab === 'payout' && (
                <PayoutForm
                  balance={finance.balance}
                  amount={amount}
                  setAmount={setAmount}
                  method={method}
                  setMethod={setMethod}
                  reference={reference}
                  setReference={setReference}
                  notes={notes}
                  setNotes={setNotes}
                  onSubmit={() => setConfirmOpen(true)}
                />
              )}

              {tab === 'history' && (
                <PayoutHistory
                  payouts={finance.payouts}
                  pendingActionId={pendingActionId}
                  onAction={handlePendingAction}
                />
              )}

              {tab === 'ledger' && (
                <LedgerView
                  ledger={finance.ledger}
                  earnings={finance.earnings}
                  reconciliation={finance.reconciliation}
                />
              )}
            </>
          ) : null}
        </>
      )}

      {/* Confirm modal */}
      {confirmOpen && selected && finance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !submitting && setConfirmOpen(false)}>
          <div
            className="max-w-md w-full p-6"
            style={{ background: '#1a1a1e', border: '2px solid #e1ad2d' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white uppercase mb-4">Confirm Payout</h2>
            <div className="space-y-2 text-sm mb-6">
              <Row label="Vendor" value={`${selected.displayName} (@${selected.name})`} />
              <Row label="Amount" value={`$${fmt(parseFloat(amount) || 0)}`} valueClass="text-accent font-bold text-lg" />
              <Row label="Method" value={method} />
              {reference && <Row label="Reference" value={reference} />}
              <Row label="Notes" value={notes} />
              <div className="border-t border-dark-700 my-2" />
              <Row label="Balance before" value={`$${fmt(finance.balance)}`} />
              <Row label="Balance after" value={`$${fmt(finance.balance - (parseFloat(amount) || 0))}`} valueClass="text-orange-400" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm text-gray-400 hover:text-white border border-dark-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePayout}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-bold uppercase disabled:opacity-50"
                style={{ background: '#e1ad2d', color: '#1a1a1e' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Pay Out'}
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

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-xs uppercase font-medium border-b-2 transition-colors ${
        active ? 'text-accent border-accent' : 'text-gray-400 border-transparent hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 text-[10px] uppercase">{label}</span>
      <span className={`text-gray-200 text-right break-all ${valueClass || ''}`}>{value}</span>
    </div>
  )
}

function PayoutForm(props: {
  balance: number
  amount: string; setAmount: (v: string) => void
  method: string; setMethod: (v: string) => void
  reference: string; setReference: (v: string) => void
  notes: string; setNotes: (v: string) => void
  onSubmit: () => void
}) {
  const { balance, amount, setAmount, method, setMethod, reference, setReference, notes, setNotes, onSubmit } = props
  const num = parseFloat(amount) || 0
  const valid = num > 0 && num <= balance && notes.trim().length >= 5
  return (
    <div className="p-5 max-w-2xl" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase text-gray-400 block mb-1">Amount</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              max={balance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-3 py-2 text-sm text-white focus:outline-none"
              style={{ background: '#111', border: '2px solid #2a2a2e' }}
            />
            <button
              type="button"
              onClick={() => setAmount(balance.toFixed(2))}
              className="px-3 py-2 text-xs uppercase text-accent border-2 border-accent hover:bg-accent hover:text-dark-900 transition-colors"
            >
              Max
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Available: ${fmt(balance)}</p>
        </div>

        <div>
          <label className="text-[10px] uppercase text-gray-400 block mb-1">Payment Method</label>
          <select
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="w-full px-3 py-2 text-sm text-white focus:outline-none"
            style={{ background: '#111', border: '2px solid #2a2a2e' }}
          >
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase text-gray-400 block mb-1">Reference (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="TX hash, PayPal email, $cashtag..."
            className="w-full px-3 py-2 text-sm text-white focus:outline-none"
            style={{ background: '#111', border: '2px solid #2a2a2e' }}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase text-gray-400 block mb-1">
            Notes <span className="text-red-400">*</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Why this payout (min 5 chars)"
            rows={3}
            className="w-full px-3 py-2 text-sm text-white focus:outline-none resize-none"
            style={{ background: '#111', border: '2px solid #2a2a2e' }}
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={!valid}
          className="w-full px-4 py-3 text-sm font-bold uppercase disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: '#e1ad2d', color: '#1a1a1e' }}
        >
          Pay Out ${fmt(num)}
        </button>
      </div>
    </div>
  )
}

function PayoutHistory({ payouts, pendingActionId, onAction }: { payouts: Payout[]; pendingActionId: string | null; onAction: (id: string, action: 'complete' | 'reject') => void }) {
  if (payouts.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No payouts yet for this vendor.</p>
  }
  return (
    <div className="overflow-x-auto" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
      <table className="w-full">
        <thead>
          <tr className="text-gray-400 text-[10px] uppercase border-b border-dark-700">
            <th className="text-left p-3">Date</th>
            <th className="text-right p-3">Amount</th>
            <th className="text-left p-3">Method</th>
            <th className="text-left p-3">Notes</th>
            <th className="text-left p-3">Status</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map(p => (
            <tr key={p.id} className="border-b border-dark-700/50 text-sm">
              <td className="p-3 text-gray-300 text-xs">{new Date(p.createdAt).toLocaleString()}</td>
              <td className="p-3 text-right text-white font-semibold">${fmt(Number(p.amount))}</td>
              <td className="p-3 text-gray-300 text-xs">{p.paymentMethod}</td>
              <td className="p-3 text-gray-400 text-xs max-w-xs truncate" title={p.adminNotes}>{p.adminNotes || '—'}</td>
              <td className="p-3">
                <StatusBadge status={p.status} />
              </td>
              <td className="p-3 text-right">
                {p.status === 'pending' ? (
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => onAction(p.id, 'complete')}
                      disabled={pendingActionId === p.id}
                      className="px-2 py-1 text-[10px] uppercase bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3 h-3 inline mr-1" /> Mark Paid
                    </button>
                    <button
                      onClick={() => onAction(p.id, 'reject')}
                      disabled={pendingActionId === p.id}
                      className="px-2 py-1 text-[10px] uppercase bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <XCircle className="w-3 h-3 inline mr-1" /> Reject
                    </button>
                  </div>
                ) : <span className="text-gray-600 text-[10px]">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    pending:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Pending' },
    completed: { color: 'text-green-400',  bg: 'bg-green-500/10',  label: 'Paid' },
    rejected:  { color: 'text-red-400',    bg: 'bg-red-500/10',    label: 'Rejected' },
  }
  const c = cfg[status] || { color: 'text-gray-400', bg: 'bg-gray-500/10', label: status }
  return <span className={`text-[10px] px-2 py-1 uppercase ${c.bg} ${c.color}`}>{c.label}</span>
}

function LedgerView({ ledger, earnings, reconciliation }: { ledger: LedgerEntry[]; earnings: VendorEarning[]; reconciliation: VendorFinance['reconciliation'] }) {
  const b = reconciliation.breakdown
  return (
    <div className="space-y-6">
      {/* Reconciliation card */}
      <div className="p-4" style={{ background: '#1a1a1e', border: `2px solid ${reconciliation.ok ? '#2a2a2e' : '#e67e22'}` }}>
        <h3 className="text-xs text-gray-400 uppercase mb-3">Reconciliation Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <BreakRow label="+ Net Earnings" value={b.netEarnings} color="text-purple-400" />
          <BreakRow label="+ Refunds" value={b.refunds} color="text-blue-400" />
          <BreakRow label="− Purchases" value={-b.purchases} color="text-red-400" />
          <BreakRow label="− Completed Payouts" value={-b.completedPayouts} color="text-orange-400" />
          <BreakRow label="− Pending Payouts (locked)" value={-b.pendingPayouts} color="text-yellow-400" />
          <BreakRow label="= Expected Wallet" value={reconciliation.expected} color="text-white font-bold" />
        </div>
        <div className="border-t border-dark-700 mt-3 pt-3 grid grid-cols-3 gap-3 text-sm">
          <BreakRow label="Expected" value={reconciliation.expected} color="text-gray-300" />
          <BreakRow label="Actual" value={reconciliation.actual} color="text-gray-300" />
          <BreakRow label="Delta" value={reconciliation.delta} color={reconciliation.ok ? 'text-green-400' : 'text-orange-400 font-bold'} />
        </div>
        {!reconciliation.ok && (
          <p className="text-orange-400 text-xs mt-3 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Wallet does not match expected balance. Likely from past admin removes that did not write to ledger (pre-fix), or manual SQL.
          </p>
        )}
      </div>

      {/* Earnings */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase mb-2">Vendor Earnings ({earnings.length})</h3>
        {earnings.length === 0 ? (
          <p className="text-gray-500 text-xs">No earnings yet.</p>
        ) : (
          <div className="overflow-x-auto" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-[10px] uppercase border-b border-dark-700">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Order</th>
                  <th className="text-right p-2">Sale</th>
                  <th className="text-right p-2">Fee</th>
                  <th className="text-right p-2">Net</th>
                </tr>
              </thead>
              <tbody>
                {earnings.slice(0, 30).map(e => (
                  <tr key={e.id} className="border-b border-dark-700/50">
                    <td className="p-2 text-gray-300 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                    <td className="p-2 text-gray-500 text-[10px] truncate max-w-[200px]" title={e.orderId}>{e.orderId}</td>
                    <td className="p-2 text-right text-white">${fmt(Number(e.saleAmount))}</td>
                    <td className="p-2 text-right text-gray-500">${fmt(Number(e.platformFee))}</td>
                    <td className="p-2 text-right text-green-400 font-semibold">${fmt(Number(e.netAmount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {earnings.length > 30 && <p className="p-2 text-[10px] text-gray-500 text-center">Showing 30 of {earnings.length}</p>}
          </div>
        )}
      </div>

      {/* Ledger */}
      <div>
        <h3 className="text-xs text-gray-400 uppercase mb-2">Transaction Ledger ({ledger.length})</h3>
        {ledger.length === 0 ? (
          <p className="text-gray-500 text-xs">No ledger entries.</p>
        ) : (
          <div className="space-y-1" style={{ background: '#1a1a1e', border: '2px solid #2a2a2e', padding: '12px' }}>
            {ledger.map(l => (
              <div key={l.id} className="flex items-start justify-between py-2 border-b border-dark-700/50 last:border-0 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <LedgerTypeBadge type={l.type} />
                    <span className="text-gray-300 text-xs">{l.description}</span>
                  </div>
                  <p className="text-gray-500 text-[10px] mt-0.5">{new Date(l.createdAt).toLocaleString()}</p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ml-3 ${Number(l.amount) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {Number(l.amount) >= 0 ? '+' : ''}${fmt(Number(l.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LedgerTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    deposit: 'text-green-400',
    purchase: 'text-blue-400',
    vendor_earning: 'text-purple-400',
    vendor_payout: 'text-orange-400',
    refund: 'text-cyan-400',
    referral_commission: 'text-pink-400',
    admin_adjust: 'text-yellow-400',
  }
  return (
    <span className={`text-[10px] uppercase px-1.5 py-0.5 bg-dark-700 ${colors[type] || 'text-gray-400'}`}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

function BreakRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`text-sm ${color}`}>${fmt(value)}</p>
    </div>
  )
}
