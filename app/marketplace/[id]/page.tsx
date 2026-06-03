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
import { ArrowLeft, Wallet, CreditCard, Zap, PackageCheck, ShieldCheck, Sparkles, Crown } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { iconUrl } from '@/lib/itemIcon'
import { rarityStyle } from '@/lib/rarity'
import { fragtrakInfo } from '@/lib/fragtrakIcon'
import { useItemBotStatus, type ItemBotStatus } from '@/hooks/useItemBotStatus'
import MarketplaceOutageBanner from '@/components/MarketplaceOutageBanner'

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
  const itemBot = useItemBotStatus()
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
  const ft = fp.fragtrakr ? fragtrakInfo(fp.fragtrak_type) : null

  // Bucket similar listings: same skin (variants of THIS skin) vs other
  const sameSkin = similar.filter(l => l.vaultItem.catalog.name === listing.vaultItem.catalog.name)
  const otherSimilar = similar.filter(l => l.vaultItem.catalog.name !== listing.vaultItem.catalog.name)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black pb-32 md:pb-12">
      <MarketplaceOutageBanner />
      {/* Back button: aligned with the site logo's left edge in the fixed
          header — uses the same horizontal padding as the header (px-3 sm:px-5
          lg:px-8) so it lines up directly under the SNIPER DUELS SHOP mark. */}
      <div className="w-full px-3 sm:px-5 lg:px-8 pt-3 md:pt-4">
        <Link
          href={demoFromUrl ? '/marketplace?demo=1' : '/marketplace'}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-md px-2.5 py-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4"/> Back
        </Link>
      </div>
      <div className="max-w-5xl mx-auto px-3 md:px-6 pt-3 md:pt-4 pb-4 md:pb-8">
        <div className="grid md:grid-cols-2 gap-4 md:gap-8">
          {/* Hero image */}
          <div
            className={`relative aspect-square ${s.bg} rounded-2xl overflow-hidden flex items-center justify-center p-6 md:p-10`}
            style={{
              border: `1.5px solid ${s.dotHex}`,
              boxShadow: `0 0 0 1px ${s.dotHex}26`,
            }}
          >
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
            {ft && (
              <div className="absolute top-3 left-3 bg-zinc-950/90 border border-red-500/40 rounded-md flex items-center gap-1.5 pl-1.5 pr-2 py-1 shadow-md">
                <img src={ft.iconUrl} alt={ft.label} className="w-4 h-4" loading="lazy" />
                <span className="text-xs font-bold text-red-400 tracking-wide">
                  {fp.kills.toLocaleString()} {ft.abbr}
                </span>
              </div>
            )}
          </div>

          {/* Info & buy */}
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-1">
              <span className="font-bold" style={{ color: s.dotHex }}>{s.label}</span>
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

            {/* Attribute chips — rarity first, then condition / FX / FT / festive */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span
                className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded bg-zinc-950/85 border inline-flex items-center leading-none"
                style={{ borderColor: `${s.dotHex}80`, color: s.dotHex }}
                title={`Rarity · ${s.label}`}
              >
                {s.label}
              </span>
              {fp.condition && (
                <span
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                  title={`Condition · ${fp.condition}`}
                >
                  {fp.condition}
                </span>
              )}
              {fp.fx && (
                <span
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1"
                  title={`FX effect · ${fp.fx}`}
                >
                  <Sparkles className="w-3 h-3" />FX · {fp.fx}
                </span>
              )}
              {ft && (
                <span
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/30 inline-flex items-center gap-1"
                  title={`${ft.label} tracker — counts in-game ${ft.label.toLowerCase()}`}
                >
                  <img src={ft.iconUrl} alt="" className="w-3 h-3" loading="lazy" />
                  {ft.label}
                </span>
              )}
              {fp.festive && (
                <span
                  className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30"
                  title="Festive variant — from a holiday or event crate"
                >
                  Festive
                </span>
              )}
            </div>

            {/* The fragtrakr counter is the only kill stat — show it big when present */}
            {ft && (
              <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                <img src={ft.iconUrl} alt={ft.label} className="w-8 h-8" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">{ft.label}</div>
                  <div className="text-2xl font-extrabold text-red-400">{fp.kills.toLocaleString()}</div>
                </div>
              </div>
            )}

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
                itemBot={itemBot}
              />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <TrustItem icon={<Zap className="w-4 h-4" />} title="Fast delivery" body="Bot delivers in-game within ~2 minutes." />
          <TrustItem icon={<PackageCheck className="w-4 h-4" />} title="In stock now" body="Bot already holds this exact item — no waiting on supply." />
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
          itemBot={itemBot}
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
  const ft = fp.fragtrakr ? fragtrakInfo(fp.fragtrak_type) : null

  return (
    <Link
      href={href}
      className="group relative block bg-zinc-900 rounded-xl overflow-hidden transition-all active:scale-95 md:hover:scale-[1.03] border border-zinc-700/60 md:hover:border-zinc-500"
    >
      <div className="relative aspect-square bg-zinc-900/40 flex items-center justify-center p-2">
        {icon ? (
          <Image src={icon} alt={listing.vaultItem.catalog.name} width={150} height={150}
                 className="object-contain w-full h-full" unoptimized />
        ) : (
          <div className="text-zinc-700 text-[9px]">{listing.vaultItem.catalog.weapon}</div>
        )}
        <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-0.5 max-w-[75%]">
          <span
            className="rounded px-1 py-0.5 bg-zinc-950/85 border text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap inline-flex items-center leading-none"
            style={{ borderColor: `${s.dotHex}80`, color: s.dotHex }}
            title={`Rarity · ${s.label}`}
          >
            {s.label}
          </span>
          {ft && (
            <span
              className="rounded bg-zinc-950/85 border border-red-500/40 flex items-center gap-0.5 pl-0.5 pr-1 py-0.5 whitespace-nowrap leading-none"
              title={`${ft.label} tracker · ${fp.kills.toLocaleString()}`}
            >
              <img src={ft.iconUrl} alt={ft.label} className="w-2.5 h-2.5 md:w-3 md:h-3" loading="lazy" />
              <span className="text-[9px] md:text-[10px] font-bold text-red-400 tracking-wide leading-none">
                {fp.kills >= 1000 ? `${(fp.kills/1000).toFixed(1)}k` : fp.kills}
              </span>
            </span>
          )}
        </div>
        {fp.fx && (
          <div className="absolute top-1.5 right-1.5 bg-cyan-500/95 text-zinc-900 rounded w-4 h-4 md:w-5 md:h-5 flex items-center justify-center" title={`FX · ${fp.fx}`}>
            <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
          </div>
        )}
      </div>
      <div className="p-2 border-t border-zinc-800/60 text-center">
        <div className="text-[10px] md:text-[11px] text-zinc-400 truncate">{listing.vaultItem.catalog.skin}</div>
        <div className="text-sm md:text-base font-extrabold text-emerald-400 tabular-nums">${Number(listing.priceUsd).toFixed(2)}</div>
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
  itemBot?: ItemBotStatus | null
}) {
  const { price, minOfferUsd, user, walletBalance, isOwn, buying, onBuy, onLogin, robloxName, setRobloxName, compact, itemBot } = props
  const canAfford = walletBalance >= price

  // State-aware queue caption — only when the bot isn't in lobby/online happy
  // path. Buy buttons stay enabled in every case; the message just sets the
  // right expectation about delivery timing.
  let queueHint: { tone: 'busy' | 'offline'; text: string } | null = null
  if (itemBot) {
    if (!itemBot.online && itemBot.state !== 'lobby') {
      queueHint = {
        tone: 'offline',
        text: 'Bot is reconnecting — your order will queue and ship as soon as it’s back.',
      }
    } else if (itemBot.state === 'in_duel' && (itemBot.secondsAgo ?? 0) >= 30) {
      queueHint = { tone: 'busy', text: 'Bot is in a duel — your order is next in line.' }
    } else if (itemBot.state === 'trade_panel' || itemBot.state === 'trade_window') {
      queueHint = { tone: 'busy', text: 'Bot is mid-trade — your order is next in line.' }
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[9px] uppercase tracking-wider text-zinc-500">Price</div>
          <div className="text-2xl font-extrabold text-emerald-400 leading-none">${price.toFixed(2)}</div>
        </div>
        {!user ? (
          <button onClick={onLogin} className="relative inline-flex items-center justify-center shrink-0 pixel-btn-press" style={{ textDecoration: 'none' }}>
            <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-11 w-[120px]" />
            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-zinc-900 text-xs uppercase tracking-wider">
              Log in
            </span>
          </button>
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
        <button
          onClick={onLogin}
          className="relative inline-flex items-center justify-center w-full pixel-btn-press"
          style={{ textDecoration: 'none' }}
        >
          <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-12 w-full" />
          <span className="absolute inset-0 flex items-center justify-center font-extrabold text-zinc-900 text-sm uppercase tracking-wider">
            Log in to buy
          </span>
        </button>
      ) : isOwn ? (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-400 text-center">
          This is your own listing.
        </div>
      ) : (
        <div className="space-y-3">
          {queueHint && (
            <div className={`text-[11px] leading-snug px-3 py-2 rounded-md border ${
              queueHint.tone === 'offline'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                : 'bg-sky-500/10 border-sky-500/40 text-sky-200'
            }`}>
              {queueHint.text}
            </div>
          )}
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
