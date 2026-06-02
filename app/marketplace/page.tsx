'use client'

/**
 * Public marketplace — browse all active item listings.
 * Icon-first cards, mobile-tight filters, rarity-tinted borders.
 */
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, X, SlidersHorizontal, Sparkles, Flame, Crown } from 'lucide-react'
import { iconUrl } from '@/lib/itemIcon'

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

const RARITIES = ['SECRET', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON', 'KNIFE', 'COLLECTABLE']

const rarityStyle: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  COMMON:     { border: 'border-zinc-600/50',   bg: 'bg-zinc-800/40',   text: 'text-zinc-300',   glow: '' },
  UNCOMMON:   { border: 'border-emerald-500/60', bg: 'bg-emerald-900/15', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  RARE:       { border: 'border-sky-500/60',     bg: 'bg-sky-900/15',     text: 'text-sky-400',     glow: 'shadow-sky-500/10' },
  EPIC:       { border: 'border-amber-500/60',   bg: 'bg-amber-900/15',   text: 'text-amber-400',   glow: 'shadow-amber-500/10' },
  LEGENDARY:  { border: 'border-fuchsia-500/60', bg: 'bg-fuchsia-900/15', text: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/15' },
  COLLECTABLE:{ border: 'border-cyan-400/60',    bg: 'bg-cyan-900/15',    text: 'text-cyan-300',    glow: 'shadow-cyan-500/15' },
  KNIFE:      { border: 'border-rose-500/60',    bg: 'bg-rose-900/15',    text: 'text-rose-400',    glow: 'shadow-rose-500/10' },
  SECRET:     { border: 'border-yellow-300/70',  bg: 'bg-yellow-900/15',  text: 'text-yellow-300',  glow: 'shadow-yellow-300/20' },
}

function styleFor(r: string) {
  return rarityStyle[r] ?? rarityStyle.COMMON
}

export default function MarketplacePage() {
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
      list = list.filter(l =>
        l.vaultItem.catalog.name.toLowerCase().includes(q) ||
        l.vaultItem.owner.displayName?.toLowerCase().includes(q)
      )
    }
    const rarityRank = (r: string) => Math.max(0, RARITIES.indexOf(r))
    return [...list].sort((a, b) => {
      const pa = Number(a.priceUsd), pb = Number(b.priceUsd)
      if (sort === 'price-asc') return pa - pb
      if (sort === 'price-desc') return pb - pa
      const ra = (a.vaultItem.fingerprint?.rarity ?? '').toUpperCase()
      const rb = (b.vaultItem.fingerprint?.rarity ?? '').toUpperCase()
      return rarityRank(ra) - rarityRank(rb)
    })
  }, [listings, search, sort])

  const activeFilterCount =
    (type !== 'all' ? 1 : 0) + (rarity !== 'all' ? 1 : 0) + (maxUsd ? 1 : 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Live Marketplace</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Sniper Duels Items
          </h1>
          <p className="text-zinc-400 mt-2 text-sm md:text-base max-w-2xl">
            Buy real items held by the bot. Pay in-wallet or with card/crypto — delivered to your Roblox account within minutes.
          </p>
        </div>

        {/* Search + filter toggle (sticky on mobile) */}
        <div className="sticky top-0 z-20 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-zinc-950/0 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search weapon, skin, seller…"
                className="w-full pl-9 pr-9 py-3 bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 focus:outline-none text-white rounded-xl text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`shrink-0 px-3 py-3 rounded-xl border text-sm flex items-center gap-2 transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-amber-500 text-zinc-900 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5 block">Type</label>
                <select value={type} onChange={e => setType(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-lg text-sm">
                  <option value="all">All</option>
                  <option value="sniper">Snipers</option>
                  <option value="knife">Knives</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5 block">Rarity</label>
                <select value={rarity} onChange={e => setRarity(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-lg text-sm">
                  <option value="all">All</option>
                  {RARITIES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5 block">Max price</label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={maxUsd}
                  onChange={e => setMaxUsd(e.target.value)}
                  placeholder="$ any"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5 block">Sort by</label>
                <select value={sort} onChange={e => setSort(e.target.value as any)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-lg text-sm">
                  <option value="price-asc">Price · low → high</option>
                  <option value="price-desc">Price · high → low</option>
                  <option value="rarity">Rarity</option>
                </select>
              </div>
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

        {/* Results count */}
        <div className="flex items-center justify-between mt-4 mb-3 text-xs text-zinc-500">
          <span>{loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'}`}</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 md:p-12 text-center">
            <div className="text-zinc-400 mb-2">No listings match your filters.</div>
            <button onClick={() => { setSearch(''); setType('all'); setRarity('all'); setMaxUsd('') }}
                    className="text-amber-400 text-sm hover:underline">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map(l => <ItemCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function ItemCard({ listing }: { listing: Listing }) {
  const fp = listing.vaultItem.fingerprint ?? {}
  const rarity = (fp.rarity || '').toUpperCase()
  const s = styleFor(rarity)
  const icon = iconUrl(listing.vaultItem.catalog.name)
  const price = Number(listing.priceUsd)
  const isHighTier = rarity === 'LEGENDARY' || rarity === 'SECRET' || rarity === 'COLLECTABLE'

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className={`group relative block bg-zinc-900 border ${s.border} rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:border-white/40 hover:shadow-xl ${s.glow}`}
    >
      {/* Rarity stripe */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.bg}`} />

      {/* Image area */}
      <div className={`relative aspect-square ${s.bg} flex items-center justify-center p-4 border-b border-zinc-800/60`}>
        {icon ? (
          <Image
            src={icon}
            alt={listing.vaultItem.catalog.name}
            width={200}
            height={200}
            className="object-contain w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-200"
            unoptimized
          />
        ) : (
          <div className="text-zinc-700 text-xs text-center px-2">
            {listing.vaultItem.catalog.weapon}<br/>
            <span className="text-zinc-500">{listing.vaultItem.catalog.skin}</span>
          </div>
        )}
        {isHighTier && (
          <div className="absolute top-2 right-2">
            {rarity === 'SECRET' ? (
              <Crown className="w-4 h-4 text-yellow-300 drop-shadow" />
            ) : (
              <Flame className="w-4 h-4 text-fuchsia-300 drop-shadow" />
            )}
          </div>
        )}
        {fp.fragtrakr && (
          <div className="absolute bottom-2 left-2 bg-orange-500/90 text-zinc-900 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded">
            FragTrakr
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[9px] uppercase tracking-wider font-bold ${s.text}`}>
            {rarity || listing.vaultItem.catalog.type}
          </span>
          {fp.condition && (
            <span className="text-[9px] uppercase tracking-wider text-zinc-500">
              · {fp.condition}
            </span>
          )}
        </div>
        <div className="font-semibold text-white text-sm leading-tight truncate" title={listing.vaultItem.catalog.name}>
          {listing.vaultItem.catalog.name.replace(' | ', ' · ')}
        </div>

        {/* Attribute chips */}
        {(fp.fx || fp.kills > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {fp.fx && (
              <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/15 text-cyan-300 rounded">
                FX: {fp.fx}
              </span>
            )}
            {fp.kills > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-red-500/15 text-red-300 rounded">
                {fp.kills}k
              </span>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-end justify-between">
          <span className="text-lg md:text-xl font-bold text-emerald-400 leading-none">
            ${price.toFixed(2)}
          </span>
          <span className="text-[10px] text-zinc-500 truncate ml-2 max-w-[60%]" title={listing.vaultItem.owner.displayName ?? listing.vaultItem.owner.name}>
            {listing.vaultItem.owner.displayName ?? listing.vaultItem.owner.name}
          </span>
        </div>
      </div>
    </Link>
  )
}
