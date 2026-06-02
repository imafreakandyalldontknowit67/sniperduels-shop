'use client'

/**
 * Single listing detail. Hero image, attribute chips, sticky mobile buy panel,
 * "Similar listings" funnel at the bottom (same skin variants + same weapon).
 *
 * No seller info shown — this is a generalized marketplace, the bot fronts
 * all sales.
 */
import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui'
import { ArrowLeft, Wallet, CreditCard, ShieldCheck, Clock, Sparkles, Target, Crown } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { iconUrl } from '@/lib/itemIcon'
import { rarityStyle } from '@/lib/rarity'

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

export default function ListingDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <ListingDetailInner />
    </Suspense>
  )
}

function ListingDetailInner() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const sp = useSearchParams()
  const demoFromUrl = sp.get('demo') === '1'
  const demoFromEnv = process.env.NEXT_PUBLIC_DEMO_MARKETPLACE === '1'
  const demo = demoFromUrl || demoFromEnv
  const { user, walletBalance, login } = useAuth()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [similar, setSimilar] = useState<ListingDetail[]>([])
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
    fetch(`/api/marketplace/items/${id}/similar?limit=6`)
      .then(r => r.json())
      .then(d => setSimilar(d.listings ?? []))
      .catch(() => {})
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
  const s = rarityStyle(rarity)
  const price = Number(listing.priceUsd)
  const canAfford = walletBalance >= price
  const icon = iconUrl(listing.vaultItem.catalog.name)
  const isOwn = user?.id === listing.vaultItem.owner.id

  // Bucket similar listings: same skin (variants of THIS skin) vs other
  const sameSkin = similar.filter(l => l.vaultItem.catalog.name === listing.vaultItem.catalog.name)
  const otherSimilar = similar.filter(l => l.vaultItem.catalog.name !== listing.vaultItem.catalog.name)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black pb-32 md:pb-12">
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-8">
        <Link href={demoFromUrl ? '/marketplace?demo=1' : '/marketplace'} className="text-zinc-400 hover:text-white inline-flex items-center gap-1 mb-3 text-sm">
          <ArrowLeft className="w-4 h-4"/> Back
        </Link>

        <div className="grid md:grid-cols-2 gap-4 md:gap-8">
          {/* Hero image */}
          <div className={`relative aspect-square ${s.bg} border ${s.border} rounded-2xl overflow-hidden flex items-center justify-center p-6 md:p-10`}>
            {icon ? (
              <Image
                src={icon}
                alt={listing.vaultItem.catalog.name}
                width={500} height={500}
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
            {rarity === 'SECRET' && (
              <Crown className="absolute top-3 right-3 w-5 h-5 text-zinc-200 drop-shadow" />
            )}
            {fp.fragtrakr && (
              <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-2 py-1 rounded shadow-md">
                FT
              </div>
            )}
          </div>

          {/* Info & buy */}
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-1">
              <span
                className="w-2 h-2 rounded-full ring-2 ring-zinc-900/70"
                style={{ backgroundColor: s.dotHex }}
              />
              <span className={`font-bold ${s.text}`}>{s.label}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">{listing.vaultItem.catalog.type}</span>
              {listing.vaultItem.catalog.crate && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500 truncate">{listing.vaultItem.catalog.crate}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
              {listing.vaultItem.catalog.weapon}
            </h1>
            <div className={`text-lg md:text-xl font-bold ${s.text} mt-0.5`}>
              {listing.vaultItem.catalog.skin}
            </div>

            {/* Attribute chips — icon-led, short labels */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {fp.condition && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {fp.condition}
                </span>
              )}
              {fp.fx && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />FX · {fp.fx}
                </span>
              )}
              {fp.fragtrakr && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                  FragTrakr
                </span>
              )}
              {fp.festive && (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                  Festive
                </span>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Stat icon={<Target className="w-3 h-3" />} label="Kills" value={fp.kills} />
              <Stat icon={<Crown className="w-3 h-3" />} label="Quickscope" value={fp.quickscope_kills} />
              <Stat icon={null} label="Exist" value={fp.exist} />
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
        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <TrustItem icon={<Clock className="w-4 h-4" />} title="Fast delivery" body="Bot delivers in-game within ~2 minutes." />
          <TrustItem icon={<ShieldCheck className="w-4 h-4" />} title="Held in escrow" body="The bot holds the item until you accept." />
          <TrustItem icon={<Wallet className="w-4 h-4" />} title="Auto refunds" body="Anything goes wrong, money goes straight back." />
        </div>

        {/* Funnel: Same-skin variants */}
        {sameSkin.length > 0 && (
          <SimilarSection
            title={`Other ${listing.vaultItem.catalog.skin} listings`}
            subtitle={`${sameSkin.length} more variant${sameSkin.length === 1 ? '' : 's'} available — different kills, conditions, or with FragTrakr`}
            listings={sameSkin}
            demoFromUrl={demoFromUrl}
          />
        )}

        {/* Funnel: Other items same weapon */}
        {otherSimilar.length > 0 && (
          <SimilarSection
            title={`More ${listing.vaultItem.catalog.weapon} skins`}
            subtitle="You might also like…"
            listings={otherSimilar}
            demoFromUrl={demoFromUrl}
          />
        )}
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  if (value === null || value === undefined || value === '' || value === false) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">{icon}{label}</div>
      <div className="text-base md:text-lg font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : String(value)}</div>
    </div>
  )
}

function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 md:p-4 flex items-start gap-2.5">
      <div className="text-amber-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{body}</div>
      </div>
    </div>
  )
}

function SimilarSection({ title, subtitle, listings, demoFromUrl }: {
  title: string; subtitle: string; listings: ListingDetail[]; demoFromUrl: boolean
}) {
  return (
    <section className="mt-8 md:mt-12">
      <div className="mb-3">
        <h2 className="text-lg md:text-2xl font-bold text-white">{title}</h2>
        <p className="text-xs md:text-sm text-zinc-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {listings.map(l => <SimilarCard key={l.id} listing={l} demoFromUrl={demoFromUrl} />)}
      </div>
    </section>
  )
}

function SimilarCard({ listing, demoFromUrl }: { listing: ListingDetail; demoFromUrl: boolean }) {
  const fp = listing.vaultItem.fingerprint ?? {}
  const rarity = (fp.rarity || '').toUpperCase()
  const s = rarityStyle(rarity)
  const icon = iconUrl(listing.vaultItem.catalog.name)
  const href = demoFromUrl ? `/marketplace/${listing.id}?demo=1` : `/marketplace/${listing.id}`

  return (
    <Link href={href} className={`group relative block bg-zinc-900 border ${s.border} rounded-xl overflow-hidden transition-all active:scale-95 md:hover:scale-[1.03]`}>
      <div className={`relative aspect-square ${s.bg} flex items-center justify-center p-2`}>
        {icon ? (
          <Image src={icon} alt={listing.vaultItem.catalog.name} width={150} height={150}
                 className="object-contain w-full h-full" unoptimized />
        ) : (
          <div className="text-zinc-700 text-[9px]">{listing.vaultItem.catalog.weapon}</div>
        )}
        <div
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-1 ring-zinc-900"
          style={{ backgroundColor: s.dotHex }}
        />
        {fp.fragtrakr && (
          <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded">
            FT
          </div>
        )}
        {fp.fx && (
          <div className="absolute bottom-1.5 left-1.5 bg-cyan-500/90 text-zinc-900 rounded-full w-4 h-4 flex items-center justify-center" title={`FX: ${fp.fx}`}>
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        )}
        {fp.kills > 0 && (
          <div className="absolute bottom-1.5 right-1.5 bg-zinc-900/80 text-white text-[9px] font-bold rounded px-1 py-0.5">
            {fp.kills >= 1000 ? `${(fp.kills/1000).toFixed(1)}k` : fp.kills}
          </div>
        )}
      </div>
      <div className="p-2 border-t border-zinc-800/60">
        <div className="text-[11px] text-zinc-400 truncate">{listing.vaultItem.catalog.skin}</div>
        <div className="text-sm font-extrabold text-emerald-400">${Number(listing.priceUsd).toFixed(2)}</div>
      </div>
    </Link>
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
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Price</div>
          <div className="text-2xl font-extrabold text-emerald-400 leading-none">${price.toFixed(2)}</div>
        </div>
        {!user ? (
          <button onClick={onLogin} className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 font-bold text-sm">Log in</button>
        ) : isOwn ? (
          <div className="text-sm text-zinc-500 italic px-4">Your listing</div>
        ) : (
          <button
            onClick={() => onBuy(canAfford ? 'wallet' : 'pandabase')}
            disabled={!!buying || !robloxName.trim()}
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-bold text-sm shrink-0"
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
            {canAfford ? `Pay with wallet · $${walletBalance.toFixed(2)}` : `Insufficient · $${walletBalance.toFixed(2)}`}
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
            Delivered in-game within ~2 minutes after payment clears.
          </p>
        </div>
      )}
    </div>
  )
}
