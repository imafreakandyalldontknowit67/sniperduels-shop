'use client'

/**
 * Single listing detail. Hero image, attribute chips, sticky mobile buy panel.
 * Wallet vs Pandabase checkout.
 */
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui'
import { ArrowLeft, Wallet, CreditCard, ShieldCheck, Clock, Sparkles, Flame, Crown } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { iconUrl } from '@/lib/itemIcon'

interface ListingDetail {
  id: string
  priceUsd: string | number
  minOfferUsd: string | number | null
  vaultItem: {
    id: string
    fingerprint: any
    catalog: { id: string; name: string; weapon: string; skin: string; type: string; crate: string | null; slug: string | null }
    owner: { id: string; name: string; displayName: string; avatar: string | null }
  }
}

const rarityStyle: Record<string, { border: string; bg: string; text: string; gradient: string }> = {
  COMMON:      { border: 'border-zinc-600/50',    bg: 'bg-zinc-800/30',    text: 'text-zinc-300',    gradient: 'from-zinc-700/30 to-transparent' },
  UNCOMMON:    { border: 'border-emerald-500/60', bg: 'bg-emerald-900/15', text: 'text-emerald-400', gradient: 'from-emerald-600/20 to-transparent' },
  RARE:        { border: 'border-sky-500/60',     bg: 'bg-sky-900/15',     text: 'text-sky-400',     gradient: 'from-sky-600/20 to-transparent' },
  EPIC:        { border: 'border-amber-500/60',   bg: 'bg-amber-900/15',   text: 'text-amber-400',   gradient: 'from-amber-500/25 to-transparent' },
  LEGENDARY:   { border: 'border-fuchsia-500/60', bg: 'bg-fuchsia-900/15', text: 'text-fuchsia-400', gradient: 'from-fuchsia-500/25 to-transparent' },
  COLLECTABLE: { border: 'border-cyan-400/60',    bg: 'bg-cyan-900/15',    text: 'text-cyan-300',    gradient: 'from-cyan-500/25 to-transparent' },
  KNIFE:       { border: 'border-rose-500/60',    bg: 'bg-rose-900/15',    text: 'text-rose-400',    gradient: 'from-rose-500/20 to-transparent' },
  SECRET:      { border: 'border-yellow-300/70',  bg: 'bg-yellow-900/15',  text: 'text-yellow-300',  gradient: 'from-yellow-400/25 to-transparent' },
}
function styleFor(r: string) { return rarityStyle[r] ?? rarityStyle.COMMON }

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, walletBalance, login } = useAuth()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buying, setBuying] = useState<'wallet' | 'pandabase' | null>(null)
  const [robloxName, setRobloxName] = useState('')

  useEffect(() => {
    fetch(`/api/marketplace/items/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setListing(d.listing)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { if (user) setRobloxName(user.name) }, [user])

  async function buy(method: 'wallet' | 'pandabase') {
    if (!user) { login(); return }
    if (!listing) return
    setBuying(method); setError(null)
    try {
      const res = await fetch(`/api/marketplace/items/${id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, robloxName: robloxName.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Purchase failed')
        return
      }
      if (data.status === 'wallet_paid') {
        router.push(`/orders/items/${data.orderId}`)
      } else {
        router.push(`/orders/items/${data.orderId}?awaitPayment=1`)
      }
    } finally {
      setBuying(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="aspect-square md:aspect-[4/3] bg-zinc-900 rounded-2xl animate-pulse mb-4" />
          <div className="h-8 bg-zinc-900 rounded animate-pulse mb-2 w-2/3" />
          <div className="h-6 bg-zinc-900 rounded animate-pulse w-1/3" />
        </div>
      </div>
    )
  }
  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <Link href="/marketplace" className="text-zinc-400 hover:text-white inline-flex items-center gap-1 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4"/> Marketplace
        </Link>
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-red-200">{error ?? 'Listing not found'}</div>
      </div>
    )
  }

  const fp = listing.vaultItem.fingerprint ?? {}
  const rarity = (fp.rarity || '').toUpperCase()
  const s = styleFor(rarity)
  const price = Number(listing.priceUsd)
  const canAfford = walletBalance >= price
  const icon = iconUrl(listing.vaultItem.catalog.name)
  const isHighTier = rarity === 'LEGENDARY' || rarity === 'SECRET' || rarity === 'COLLECTABLE'
  const isOwn = user?.id === listing.vaultItem.owner.id

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black pb-32 md:pb-12">
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-8">
        <Link href="/marketplace" className="text-zinc-400 hover:text-white inline-flex items-center gap-1 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4"/> Back to Marketplace
        </Link>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Hero image */}
          <div className={`relative aspect-square ${s.bg} bg-gradient-to-br ${s.gradient} border ${s.border} rounded-2xl overflow-hidden flex items-center justify-center p-6 md:p-10`}>
            {icon ? (
              <Image
                src={icon}
                alt={listing.vaultItem.catalog.name}
                width={500}
                height={500}
                className="object-contain w-full h-full drop-shadow-2xl"
                priority
                unoptimized
              />
            ) : (
              <div className="text-center">
                <div className="text-3xl font-bold text-zinc-400">{listing.vaultItem.catalog.weapon}</div>
                <div className="text-xl text-zinc-500 mt-1">{listing.vaultItem.catalog.skin}</div>
              </div>
            )}
            {isHighTier && (
              <div className={`absolute top-3 right-3 ${s.bg} ${s.border} border rounded-full px-2.5 py-1 flex items-center gap-1`}>
                {rarity === 'SECRET' ? <Crown className={`w-3 h-3 ${s.text}`} /> : <Flame className={`w-3 h-3 ${s.text}`} />}
                <span className={`text-[10px] uppercase tracking-wider font-bold ${s.text}`}>{rarity}</span>
              </div>
            )}
          </div>

          {/* Info & buy */}
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              {listing.vaultItem.catalog.type}
              {listing.vaultItem.catalog.crate && <> · {listing.vaultItem.catalog.crate}</>}
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
              {listing.vaultItem.catalog.weapon}
            </h1>
            <div className={`text-lg md:text-xl font-bold ${s.text} mt-1`}>
              {listing.vaultItem.catalog.skin}
            </div>

            {/* Attribute chips */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {rarity && (
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${s.bg} ${s.text} border ${s.border}`}>
                  {rarity}
                </span>
              )}
              {fp.condition && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {fp.condition}
                </span>
              )}
              {fp.fx && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="w-3 h-3 inline mr-1" />FX · {fp.fx}
                </span>
              )}
              {fp.fragtrakr && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                  FragTrakr
                </span>
              )}
              {fp.festive && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                  Festive
                </span>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Stat label="Kills" value={fp.kills} />
              <Stat label="Quickscope" value={fp.quickscope_kills} />
              <Stat label="Exist" value={fp.exist} />
            </div>

            {/* Seller */}
            <div className="mt-4 flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                {(listing.vaultItem.owner.displayName ?? listing.vaultItem.owner.name).charAt(0).toUpperCase()}
              </div>
              <span className="text-zinc-400">Listed by</span>
              <span className="text-white font-medium">{listing.vaultItem.owner.displayName ?? listing.vaultItem.owner.name}</span>
            </div>

            {/* Price + buy panel - inline on desktop, sticky bottom on mobile */}
            <div className="hidden md:block mt-6">
              <BuyPanel
                price={price}
                minOfferUsd={listing.minOfferUsd ? Number(listing.minOfferUsd) : null}
                user={user}
                walletBalance={walletBalance}
                isOwn={isOwn}
                buying={buying}
                onBuy={buy}
                onLogin={login}
                robloxName={robloxName}
                setRobloxName={setRobloxName}
              />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          <TrustItem icon={<Clock className="w-4 h-4" />} title="Fast Delivery" body="Bot delivers in-game within ~2 minutes." />
          <TrustItem icon={<ShieldCheck className="w-4 h-4" />} title="Safe Trades" body="Held in escrow by the bot until you accept." />
          <TrustItem icon={<Wallet className="w-4 h-4" />} title="Auto Refunds" body="Anything goes wrong, money goes straight back." />
        </div>
      </div>

      {/* Sticky mobile buy bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <BuyPanel
          price={price}
          minOfferUsd={listing.minOfferUsd ? Number(listing.minOfferUsd) : null}
          user={user}
          walletBalance={walletBalance}
          isOwn={isOwn}
          buying={buying}
          onBuy={buy}
          onLogin={login}
          robloxName={robloxName}
          setRobloxName={setRobloxName}
          compact
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '' || value === false) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-lg font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : String(value)}</div>
    </div>
  )
}

function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
      <div className="text-amber-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{body}</div>
      </div>
    </div>
  )
}

function BuyPanel(props: {
  price: number
  minOfferUsd: number | null
  user: any
  walletBalance: number
  isOwn: boolean
  buying: 'wallet' | 'pandabase' | null
  onBuy: (m: 'wallet' | 'pandabase') => void
  onLogin: () => void
  robloxName: string
  setRobloxName: (s: string) => void
  compact?: boolean
}) {
  const { price, minOfferUsd, user, walletBalance, isOwn, buying, onBuy, onLogin, robloxName, setRobloxName, compact } = props
  const canAfford = walletBalance >= price

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Price</div>
          <div className="text-2xl font-extrabold text-emerald-400 leading-none">${price.toFixed(2)}</div>
        </div>
        {!user ? (
          <button onClick={onLogin} className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold text-sm">Log in to buy</button>
        ) : isOwn ? (
          <div className="text-sm text-zinc-500 italic px-4">Your listing</div>
        ) : (
          <button
            onClick={() => onBuy(canAfford ? 'wallet' : 'pandabase')}
            disabled={!!buying || !robloxName.trim()}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-bold text-sm shrink-0"
          >
            {buying ? 'Processing…' : 'Buy now'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Price</div>
          <div className="text-4xl font-extrabold text-emerald-400">${price.toFixed(2)}</div>
        </div>
        {minOfferUsd && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Min offer</div>
            <div className="text-sm text-zinc-300">${minOfferUsd.toFixed(2)}</div>
          </div>
        )}
      </div>

      {!user ? (
        <Button onClick={onLogin} className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold">Log in to buy</Button>
      ) : isOwn ? (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-400 text-center">
          This is your own listing.
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Deliver to Roblox username</label>
            <input
              type="text"
              value={robloxName}
              onChange={e => setRobloxName(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 focus:border-amber-500/60 focus:outline-none text-white rounded-lg text-sm"
              placeholder={user.name}
            />
          </div>
          <button
            onClick={() => onBuy('wallet')}
            disabled={!canAfford || !!buying || !robloxName.trim()}
            className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-900 font-bold text-sm flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            {canAfford ? `Pay with wallet · $${walletBalance.toFixed(2)}` : `Insufficient balance · $${walletBalance.toFixed(2)}`}
          </button>
          <button
            onClick={() => onBuy('pandabase')}
            disabled={!!buying || !robloxName.trim()}
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white font-medium text-sm flex items-center justify-center gap-2 border border-zinc-700"
          >
            <CreditCard className="w-4 h-4" /> Card / Crypto
          </button>
          <p className="text-[11px] text-zinc-500 flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
            Delivered in-game within ~2 minutes after payment clears. Anything goes wrong, you get an automatic refund.
          </p>
        </div>
      )}
    </div>
  )
}
