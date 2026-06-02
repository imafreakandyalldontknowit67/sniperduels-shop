'use client'

/**
 * Public marketplace — browse all active item listings.
 *
 * Mobile-first: cards are icon-led, minimal text. Per-instance details (kills,
 * FX, FragTrakr, condition) shown as tiny icon-only chips at the bottom of
 * the card. No seller name (this is a generalized storefront — the bot
 * fronts all listings).
 */
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal, Sparkles, Zap, Target, Crown } from 'lucide-react'
import { iconUrl } from '@/lib/itemIcon'
import { rarityStyle, RARITY_OPTIONS } from '@/lib/rarity'

interface Listing {
  id: string
  priceUsd: string | number
  minOfferUsd: string | number | null
  vaultItem: {
    id: string
    fingerprint: any
    catalog: { name: string; weapon: string; skin: string; type: string; crate: string | null }
    owner: { id: string; name: string; displayName: string; avatar: string | null }
  }
}

export default function MarketplacePage() {
  const sp = useSearchParams()
  // Build-time env: NEXT_PUBLIC_DEMO_MARKETPLACE=1 forces demo for the entire
  // deploy (e.g. designer preview on a Coolify dev URL). URL ?demo=1 also
  // works case-by-case.
  const demo = sp.get('demo') === '1' || process.env.NEXT_PUBLIC_DEMO_MARKETPLACE === '1'
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<string>('all')
  const [rarity, setRarity] = useState<string>('all')
  const [maxUsd, setMaxUsd] = useState<string>('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<'price-asc' | 'price-desc' | 'rarity'>('price-asc')

  async function fetchListings() {
    setLoading(true)
    const qs = new URLSearchParams()
    if (type !== 'all') qs.set('type', type)
    if (rarity !== 'all') qs.set('rarity', rarity)
    if (maxUsd) qs.set('maxUsd', maxUsd)
    if (demo) qs.set('demo', '1')
    qs.set('limit', '200')
    const res = await fetch(`/api/marketplace/items?${qs}`)
    const data = await res.json()
    setListings(data.listings ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [type, rarity, maxUsd])

  const filtered = useMemo(() => {
    let list = listings
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(l => l.vaultItem.catalog.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const pa = Number(a.priceUsd), pb = Number(b.priceUsd)
      if (sort === 'price-asc') return pa - pb
      if (sort === 'price-desc') return pb - pa
      const ra = rarityStyle(a.vaultItem.fingerprint?.rarity).power
      const rb = rarityStyle(b.vaultItem.fingerprint?.rarity).power
      return rb - ra  // rarer first
    })
  }, [listings, search, sort])

  const activeFilterCount =
    (type !== 'all' ? 1 : 0) + (rarity !== 'all' ? 1 : 0) + (maxUsd ? 1 : 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-5 md:py-10">
        {/* Header */}
        <div className="mb-5 md:mb-8 px-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
              {demo ? 'Preview · Fake Listings' : 'Live Marketplace'}
            </span>
          </div>
          <h1 className="text-2xl md:text-5xl font-extrabold text-white tracking-tight">
            Sniper Duels Items
          </h1>
          <p className="text-zinc-400 mt-1.5 text-xs md:text-base max-w-2xl">
            Buy from the bot. Delivered in-game in minutes. Auto-refunded if anything goes wrong.
          </p>
          {demo && !process.env.NEXT_PUBLIC_DEMO_MARKETPLACE && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-300">
              <span className="font-semibold">Demo mode</span>
              <span className="text-amber-200/80"> — fake UX preview. Buy buttons won&apos;t actually purchase.</span>
            </div>
          )}
        </div>

        {/* Search + filter (sticky on mobile) */}
        <div className="sticky top-0 z-20 -mx-3 md:mx-0 px-3 md:px-0 py-2 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-zinc-950/0 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-9 pr-9 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 focus:outline-none text-white rounded-xl text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`shrink-0 px-3 py-2.5 rounded-xl border text-sm flex items-center gap-1.5 transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="bg-amber-500 text-zinc-900 text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              <SelectField label="Type" value={type} onChange={setType} options={[
                { value: 'all', label: 'All' },
                { value: 'sniper', label: 'Snipers' },
                { value: 'knife', label: 'Knives' },
              ]} />
              <SelectField label="Rarity" value={rarity} onChange={setRarity} options={[
                { value: 'all', label: 'All' },
                ...RARITY_OPTIONS.map(r => ({ value: r, label: rarityStyle(r).label })),
              ]} />
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1 block">Max $</label>
                <input
                  type="number" step="0.50" min="0"
                  value={maxUsd}
                  onChange={e => setMaxUsd(e.target.value)}
                  placeholder="any"
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded-lg text-sm"
                />
              </div>
              <SelectField label="Sort" value={sort} onChange={v => setSort(v as any)} options={[
                { value: 'price-asc', label: 'Price low → high' },
                { value: 'price-desc', label: 'Price high → low' },
                { value: 'rarity', label: 'Rarest first' },
              ]} />
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setType('all'); setRarity('all'); setMaxUsd('') }}
                  className="col-span-2 md:col-span-4 text-xs text-zinc-400 hover:text-white py-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-[11px] text-zinc-500 mt-3 mb-2 px-1">
          {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 md:p-12 text-center">
            <div className="text-zinc-400 mb-3">
              {demo ? 'No demo listings match.' : 'No listings yet.'}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button onClick={() => { setSearch(''); setType('all'); setRarity('all'); setMaxUsd('') }}
                      className="text-amber-400 text-sm hover:underline">
                Clear all filters
              </button>
              {!demo && (
                <Link href="/marketplace?demo=1"
                      className="text-zinc-500 text-sm hover:text-amber-400">
                  · See a UX preview with fake items
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
            {filtered.map(l => <ItemCard key={l.id} listing={l} demo={demo} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1 block">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded-lg text-sm">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ItemCard({ listing, demo }: { listing: Listing; demo: boolean }) {
  const fp = listing.vaultItem.fingerprint ?? {}
  const rarity = (fp.rarity || '').toUpperCase()
  const s = rarityStyle(rarity)
  const icon = iconUrl(listing.vaultItem.catalog.name)
  const price = Number(listing.priceUsd)
  const isHighTier = s.power >= 5
  const href = demo ? `/marketplace/${listing.id}?demo=1` : `/marketplace/${listing.id}`
  const skin = listing.vaultItem.catalog.skin

  return (
    <Link
      href={href}
      className={`group relative block bg-zinc-900 border ${s.border} rounded-xl overflow-hidden transition-all duration-200 active:scale-95 md:hover:scale-[1.02] md:hover:shadow-xl ${s.glow}`}
    >
      {/* Image area */}
      <div className={`relative aspect-square ${s.bg} flex items-center justify-center p-3 md:p-4`}>
        {icon ? (
          <Image
            src={icon}
            alt={listing.vaultItem.catalog.name}
            width={200} height={200}
            className="object-contain w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] md:group-hover:scale-105 transition-transform duration-200"
            unoptimized
          />
        ) : (
          <div className="text-zinc-700 text-[10px] text-center">
            {listing.vaultItem.catalog.weapon}
          </div>
        )}

        {/* Top-right rarity dot (always visible, no text on mobile) */}
        <div
          className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full ring-2 ring-zinc-900/70"
          style={{ backgroundColor: s.dotHex }}
          title={s.label}
        />

        {/* Top-left: FT (FragTrakr) red badge — small, clear */}
        {fp.fragtrakr && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-md">
            FT
          </div>
        )}

        {/* Bottom-left: icon-only attribute chips, no text */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          {fp.fx && (
            <div className="bg-cyan-500/90 text-zinc-900 rounded-full w-5 h-5 flex items-center justify-center shadow" title={`FX: ${fp.fx}`}>
              <Sparkles className="w-3 h-3" />
            </div>
          )}
          {fp.kills > 0 && (
            <div className="bg-zinc-900/80 text-white text-[10px] font-bold rounded-full px-1.5 h-5 flex items-center gap-0.5 shadow" title={`${fp.kills} kills`}>
              <Target className="w-2.5 h-2.5 text-red-400" />
              {fp.kills >= 1000 ? `${(fp.kills/1000).toFixed(1)}k` : fp.kills}
            </div>
          )}
        </div>

        {/* Top-tier crown */}
        {isHighTier && rarity === 'SECRET' && (
          <Crown className="absolute top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 text-zinc-200 drop-shadow" />
        )}
      </div>

      {/* Footer: skin name + price (no weapon, no seller — keep it lean) */}
      <div className={`p-2.5 md:p-3 border-t border-zinc-800/60 ${rarity === 'SECRET' ? 'bg-zinc-950' : ''}`}>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 truncate font-medium">
          {listing.vaultItem.catalog.weapon}
        </div>
        <div className="font-semibold text-white text-sm md:text-base leading-tight truncate" title={skin}>
          {skin}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-base md:text-lg font-extrabold text-emerald-400 leading-none">
            ${price.toFixed(2)}
          </span>
          {fp.condition && (
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider truncate ml-2">
              {abbrevCondition(fp.condition)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function abbrevCondition(c: string): string {
  // Quick 2-letter abbreviation to keep mobile clean
  const map: Record<string, string> = {
    'MINT CONDITION': 'MN',
    'STANDARD ISSUE': 'ST',
    'WELL WORN': 'WW',
  }
  return map[c.toUpperCase()] ?? c
}
