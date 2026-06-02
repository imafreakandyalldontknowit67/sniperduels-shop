'use client'

/**
 * User's vault — items the bot is holding for them. For each:
 *   - deposited: "Set price + list" or "Withdraw"
 *   - listed: shows live price, "Edit price" or "Unlist" or "Withdraw"
 *   - reserved: locked, delivery in flight
 *   - withdrawing: bot is sending it back
 *
 * Top of page: "Deposit items" button. Clicks create an ItemDepositSession
 * and show join instructions + live status poll.
 */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Package, Plus, RefreshCw, Tag, X, ArrowDownToLine } from 'lucide-react'
import { useAuth } from '@/components/providers'

interface VaultItem {
  id: string
  status: string
  depositedAt: string
  fingerprint: any
  catalog: { name: string; weapon: string; skin: string; type: string; crate: string | null }
  listing: { id: string; priceUsd: string | number; active: boolean } | null
  delivery: { id: string; status: string; attempts: number } | null
  withdrawal: { id: string; status: string } | null
}

interface DepositSession {
  id: string
  status: string
  expiresAt: string
}

export default function VaultPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [items, setItems] = useState<VaultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<DepositSession | null>(null)
  const [pricing, setPricing] = useState<string | null>(null) // id being priced
  const [priceInput, setPriceInput] = useState('')

  async function fetchVault() {
    setLoading(true)
    try {
      const res = await fetch('/api/vault')
      const data = await res.json()
      setItems(data.items ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (user) fetchVault() }, [user])

  // Poll deposit session
  useEffect(() => {
    if (!session || ['completed', 'cancelled', 'expired'].includes(session.status)) return
    const iv = setInterval(async () => {
      const res = await fetch(`/api/vault/sessions/${session.id}`)
      if (!res.ok) return
      const data = await res.json()
      setSession(data.session)
      if (data.session.status === 'completed') {
        fetchVault()
      }
    }, 4_000)
    return () => clearInterval(iv)
  }, [session])

  async function startDeposit() {
    const res = await fetch('/api/vault/deposit', { method: 'POST' })
    const data = await res.json()
    setSession({ id: data.sessionId, status: 'pending', expiresAt: data.expiresAt })
  }

  async function listItem(itemId: string) {
    const price = Number(priceInput)
    if (!Number.isFinite(price) || price <= 0) return
    await fetch(`/api/vault/${itemId}/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceUsd: price }),
    })
    setPricing(null); setPriceInput('')
    fetchVault()
  }

  async function unlistItem(itemId: string) {
    await fetch(`/api/vault/${itemId}/unlist`, { method: 'POST' })
    fetchVault()
  }

  async function withdrawItem(itemId: string) {
    if (!confirm('Withdraw this item back to your inventory?')) return
    await fetch(`/api/vault/${itemId}/withdraw`, { method: 'POST' })
    fetchVault()
  }

  if (authLoading) return <div className="p-8 text-gray-400">Loading…</div>
  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-300">Log in to access your vault.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Package className="w-7 h-7" /> Your Vault
          </h1>
          <p className="text-gray-400 mt-1">Items the bot is holding for you. List at a price or withdraw.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchVault} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={startDeposit} disabled={!!session && session.status !== 'completed' && session.status !== 'cancelled'}>
            <Plus className="w-4 h-4 mr-2" /> Deposit items
          </Button>
        </div>
      </div>

      {session && session.status !== 'completed' && session.status !== 'cancelled' && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-white mb-2">Deposit in progress</h2>
          <p className="text-sm text-blue-100">
            Status: <span className="font-mono">{session.status}</span>.
            Join our private server and the bot will send you a trade request.
            Add the items you want to deposit and confirm — they&apos;ll appear here.
          </p>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-gray-400">
          Your vault is empty. Click <span className="text-white">Deposit items</span> to add some.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(it => (
            <div key={it.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-white truncate">{it.catalog.name}</div>
                  <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                    <span>{it.catalog.type}</span>
                    {it.fingerprint?.rarity && <span>· {it.fingerprint.rarity}</span>}
                    {it.fingerprint?.condition && <span>· {it.fingerprint.condition}</span>}
                    {it.fingerprint?.fragtrakr && <span className="text-orange-400">· fragtrakr</span>}
                    {it.fingerprint?.fx && <span className="text-cyan-400">· FX: {it.fingerprint.fx}</span>}
                    {it.fingerprint?.kills !== null && it.fingerprint?.kills !== undefined && (
                      <span>· {it.fingerprint.kills} kills</span>
                    )}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 shrink-0">{it.status}</span>
              </div>

              {it.status === 'listed' && it.listing && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-semibold">
                    ${typeof it.listing.priceUsd === 'string' ? it.listing.priceUsd : it.listing.priceUsd.toFixed(2)}
                  </span>
                </div>
              )}

              {it.status === 'reserved' && (
                <div className="mt-3 text-sm text-yellow-400">Delivery in progress — item locked.</div>
              )}
              {it.status === 'withdrawing' && (
                <div className="mt-3 text-sm text-blue-400">Bot is sending it back to you.</div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {(it.status === 'deposited' || it.status === 'listed') && (
                  <>
                    {pricing === it.id ? (
                      <div className="flex gap-2 flex-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0.10"
                          value={priceInput}
                          onChange={e => setPriceInput(e.target.value)}
                          placeholder="$ price"
                          className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-1"
                        />
                        <Button onClick={() => listItem(it.id)}>
                          {it.status === 'listed' ? 'Update' : 'List'}
                        </Button>
                        <Button variant="outline" onClick={() => { setPricing(null); setPriceInput('') }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button onClick={() => {
                          setPricing(it.id)
                          setPriceInput(it.listing ? String(it.listing.priceUsd) : '')
                        }}>
                          <Tag className="w-4 h-4 mr-1" />
                          {it.status === 'listed' ? 'Edit price' : 'Set price + list'}
                        </Button>
                        {it.status === 'listed' && (
                          <Button variant="outline" onClick={() => unlistItem(it.id)}>
                            Unlist
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => withdrawItem(it.id)}>
                          <ArrowDownToLine className="w-4 h-4 mr-1" /> Withdraw
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
