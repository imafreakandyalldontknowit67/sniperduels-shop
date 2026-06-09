'use client'

/**
 * /admin/catalog — Item-catalog management.
 *
 * Top section: candidates pending review (bot saw an item it didn't recognize).
 *   Approve → promote into ItemCatalog with source='bot_observed'.
 *   Reject  → mark as garbage / OCR error (keeps a record so we don't requeue).
 *
 * Below: current ItemCatalog table summary by weapon. Full catalog browsing
 * is at /admin/catalog/browse (separate page if/when we need it).
 */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Check, X, RefreshCw, Eye } from 'lucide-react'

interface Candidate {
  id: string
  ocrName: string
  weapon: string | null
  skin: string | null
  rarity: string | null
  condition: string | null
  fragtrakr: boolean
  fx: string | null
  crate: string | null
  observedCount: number
  firstSeenAt: string
  lastSeenAt: string
  screenshotUrl: string | null
  status: string
}

export default function CatalogAdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<string | null>(null)  // id being acted on

  async function fetchPending() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/catalog/candidates?status=pending')
      const data = await res.json()
      setCandidates(data.candidates ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPending() }, [])

  async function approve(id: string) {
    setPending(id)
    try {
      await fetch(`/api/admin/catalog/candidates/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      await fetchPending()
    } finally {
      setPending(null)
    }
  }

  async function reject(id: string) {
    const reason = prompt('Rejection reason (optional):') ?? ''
    setPending(id)
    try {
      await fetch(`/api/admin/catalog/candidates/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      await fetchPending()
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Catalog Candidates</h1>
          <p className="text-gray-400 mt-1">
            Items the bot observed in player inventories that aren&apos;t in the catalog yet.
          </p>
        </div>
        <Button onClick={fetchPending} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && candidates.length === 0 ? (
        <div className="text-gray-400">Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-gray-400">
          No pending candidates. The catalog is up to date.
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map(c => (
            <div
              key={c.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center gap-4"
            >
              {c.screenshotUrl ? (
                <a href={c.screenshotUrl} target="_blank" rel="noreferrer" className="shrink-0">
                  <img
                    src={c.screenshotUrl}
                    alt="tooltip"
                    className="w-24 h-16 object-cover rounded border border-zinc-700"
                  />
                </a>
              ) : (
                <div className="w-24 h-16 bg-zinc-800 rounded flex items-center justify-center text-zinc-500 shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-mono text-white text-lg truncate">{c.ocrName}</div>
                <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-3">
                  {c.rarity && <span>rarity: <strong className="text-gray-200">{c.rarity}</strong></span>}
                  {c.condition && <span>cond: <strong className="text-gray-200">{c.condition}</strong></span>}
                  {c.fx && <span>fx: <strong className="text-gray-200">{c.fx}</strong></span>}
                  {c.fragtrakr && <span className="text-orange-400">fragtrakr</span>}
                  {c.crate && <span>crate: <strong className="text-gray-200">{c.crate}</strong></span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  seen {c.observedCount}× · first {new Date(c.firstSeenAt).toLocaleString()} ·
                  last {new Date(c.lastSeenAt).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={() => approve(c.id)}
                  disabled={pending === c.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button
                  onClick={() => reject(c.id)}
                  disabled={pending === c.id}
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
