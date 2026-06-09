#!/usr/bin/env node
/**
 * Regenerate lib/demoListings.ts from the bot's catalog_full.json.
 *
 * Each listing is built from a REAL catalog item so its rarity, FX options,
 * FragTrakr eligibility, conditions, and festive flag are all canonical.
 *
 *   node scripts/generate-demo-listings.mjs [path/to/catalog_full.json]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const catalogPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(projectRoot, '..', 'sniperduels-item-bot', 'catalog', 'catalog_full.json')
const iconsManifestPath = path.join(projectRoot, 'lib', 'itemIcon.ts')

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
const items = catalog.items
const fragtrakTypes = catalog.fragtrak_types ?? ['FRAGTRAKR']

// Pull names that have icons (skip items that would render as blank cards).
const iconManifestSrc = fs.readFileSync(iconsManifestPath, 'utf-8')
const iconNamesMatch = iconManifestSrc.match(/const ICONS[^=]*=\s*({[\s\S]*?})\s*\n/)
const iconNames = new Set(
  iconNamesMatch
    ? Object.keys(JSON.parse(iconNamesMatch[1]))
    : items.map(it => it.name)
)

// ── Seeded RNG so demo output is stable across regenerations ────────────────
let seed = 0xC0FFEE
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0x100000000
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)] }
function maybe(p) { return rand() < p }

// Price ladder by rarity — realistic order of magnitude per tier.
const PRICE_RANGE = {
  SECRET:      [120, 220],
  LEGENDARY:   [50, 130],
  COLLECTABLE: [12, 45],
  EPIC:        [22, 70],
  RARE:        [9, 28],
  UNCOMMON:    [3, 12],
  COMMON:      [1, 5],
  KNIFE:       [12, 95],   // wide — depends on the knife
}

// Per-condition price multiplier — MINT > STANDARD > WORN.
const CONDITION_MULT = {
  'MINT CONDITION':  1.0,
  'STANDARD ISSUE':  0.85,
  'WELL WORN':       0.7,
}

// Higher-rarity items get smaller exist counts.
const EXIST_RANGE = {
  SECRET: [15, 60],
  LEGENDARY: [40, 200],
  COLLECTABLE: [100, 600],
  EPIC: [200, 800],
  RARE: [500, 2500],
  UNCOMMON: [2000, 8000],
  COMMON: [10000, 50000],
  KNIFE: [300, 3000],
}

// Higher rarities are likelier to carry FX / FT.
const FX_PROB = { SECRET: 0.55, LEGENDARY: 0.45, COLLECTABLE: 0.4, EPIC: 0.35, RARE: 0.25, UNCOMMON: 0.15, COMMON: 0.05, KNIFE: 0.05 }
const FT_PROB = { SECRET: 0.45, LEGENDARY: 0.4, COLLECTABLE: 0.3, EPIC: 0.3, RARE: 0.25, UNCOMMON: 0.2, COMMON: 0.05, KNIFE: 0.25 }

function killsForRarity(r) {
  const ranges = {
    SECRET:      [200, 4000],
    LEGENDARY:   [80, 2200],
    COLLECTABLE: [40, 800],
    EPIC:        [20, 1500],
    RARE:        [0, 600],
    UNCOMMON:    [0, 400],
    COMMON:      [0, 5000],
    KNIFE:       [0, 1200],
  }
  const [lo, hi] = ranges[r] ?? [0, 200]
  // ~30% chance the listing has zero kills (clean stat)
  if (rand() < 0.30) return 0
  return Math.floor(lo + rand() * (hi - lo))
}

// Per game_fragtrak_available.json — knives only track "Kills", snipers
// can track any of these 5 types.
const SNIPER_FRAGTRAK_TYPES = ['Kills', 'HeadshotKills', 'NoscopeKills', 'QuickscopeKills', 'LowerBodyKills']
const KNIFE_FRAGTRAK_TYPES = ['Kills']

function makeFingerprint(item) {
  const rarity = item.rarity
  const isKnife = item.weapon_type === 'Knife'
  const conds = (item.conditions ?? ['STANDARD ISSUE']).filter(c => !(item.disallowed_conditions ?? []).includes(c))
  const condition = pick(conds.length ? conds : ['STANDARD ISSUE'])

  const canFx = item.can_have_fx && (item.fx_options?.length ?? 0) > 0
  const fx = canFx && maybe(FX_PROB[rarity] ?? 0.2) ? pick(item.fx_options) : null

  const canFt = item.can_have_fragtrakr
  const fragtrakr = canFt && maybe(FT_PROB[rarity] ?? 0.2)
  // Per-weapon fragtrak type. Knives only have "Kills", snipers any of 5 types.
  // The fragtrakr is the ONLY kill counter — no separate "kills" without one.
  const fragtrakType = fragtrakr
    ? pick(isKnife ? KNIFE_FRAGTRAK_TYPES : SNIPER_FRAGTRAK_TYPES)
    : null

  // Festive is the BASE catalog flag (item IS a festive variant by design —
  // Holiday/Christmas/Halloween crates etc.). festive_eligible is too broad —
  // 282/291 items have it true. The base `festive` field is the truth.
  // Knives are never displayed with the festive badge in-game — even ones
  // from holiday crates (Karambit Cookie, Bayonet Vampiric, etc.).
  const festive = item.festive === true && !isKnife

  // Kill count only exists when fragtrakr is applied — no fragtrak, no public
  // kill count.
  const kills = fragtrakr ? killsForRarity(rarity) : 0

  return { rarity, condition, fx, fragtrakr, fragtrak_type: fragtrakType, kills, festive }
}

function priceFor(item, fingerprint) {
  const [lo, hi] = PRICE_RANGE[item.rarity] ?? [5, 50]
  let p = lo + rand() * (hi - lo)
  p *= CONDITION_MULT[fingerprint.condition] ?? 1
  if (fingerprint.fx) p *= 1.18
  if (fingerprint.fragtrakr) p *= 1.12
  if (fingerprint.festive) p *= 1.08
  if (fingerprint.kills > 1000) p *= 1.10
  return Math.max(0.99, Math.round(p * 100) / 100)
}

// (exist count removed from the demo — not needed for the UX preview)

const SELLERS = [
  ['blueclock', 'Blueclock'],
  ['snipeking', 'SnipeKing'],
  ['firebolt99', 'Firebolt99'],
  ['valkyrie', 'ValkyrieX'],
  ['kira_', 'Kira_'],
  ['pulsewave', 'PulseWave'],
  ['nightraven', 'NightRaven'],
  ['blue_zenith', 'BlueZenith'],
  ['eclipse_', 'Eclipse_'],
  ['retroslop', 'RetroSlop'],
  ['galxe', 'Galxe'],
  ['scope_god', 'ScopeGod'],
]
function sellerFor(idx) {
  const [name, displayName] = SELLERS[idx % SELLERS.length]
  return { id: `demo-user-${idx % SELLERS.length}`, name, displayName, avatar: null }
}

// ── Quota of listings per rarity (tune what the designer sees) ──────────────
const QUOTA = {
  SECRET: 8,
  LEGENDARY: 8,
  COLLECTABLE: 6,
  EPIC: 8,
  RARE: 6,
  UNCOMMON: 4,
  COMMON: 2,
  KNIFE: 14,
}

// Group items by rarity, only keep ones with icons.
const byRarity = {}
for (const it of items) {
  if (!iconNames.has(it.name)) continue
  ;(byRarity[it.rarity] ??= []).push(it)
}

// Reset seed so picks are deterministic.
seed = 0xC0FFEE

const baseListings = []
let idx = 0
for (const [rarity, quota] of Object.entries(QUOTA)) {
  const bucket = (byRarity[rarity] ?? []).slice()
  // Shuffle the bucket using the seeded RNG
  for (let i = bucket.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[bucket[i], bucket[j]] = [bucket[j], bucket[i]]
  }
  const picks = bucket.slice(0, quota)
  for (const it of picks) {
    const fp = makeFingerprint(it)
    const price = priceFor(it, fp)
    baseListings.push({ item: it, fp, price, id: `demo-${String(idx).padStart(3, '0')}`, sellerIdx: idx })
    idx++
  }
}

// Funnel: add 2 extra variants for each top-tier item so "Other [skin] listings" populates.
const headlineItems = baseListings
  .filter(l => l.fp.rarity === 'SECRET' || l.fp.rarity === 'LEGENDARY')
  .slice(0, 6)

for (const headline of headlineItems) {
  for (let v = 0; v < 2; v++) {
    const fp = makeFingerprint(headline.item)
    const price = priceFor(headline.item, fp)
    baseListings.push({ item: headline.item, fp, price, id: `demo-${String(idx).padStart(3, '0')}`, sellerIdx: idx })
    idx++
  }
}

// Convert to TS Listing format
function tsListing(l) {
  const [weapon, skin] = l.item.name.split(' | ')
  return {
    id: l.id,
    priceUsd: l.price.toFixed(2),
    minOfferUsd: l.price > 20 ? (l.price * 0.85).toFixed(2) : null,
    vaultItem: {
      id: `demo-vault-${l.id}`,
      fingerprint: l.fp,
      catalog: {
        id: `demo-cat-${l.id}`,
        name: l.item.name,
        weapon,
        skin,
        type: l.item.weapon_type === 'Knife' ? 'knife' : 'sniper',
        crate: l.item.crate ?? null,
        slug: null,
      },
      owner: sellerFor(l.sellerIdx),
    },
  }
}

const allListings = baseListings.map(tsListing)

const tsBody = `/**
 * Hardcoded marketplace listings for UX preview ONLY.
 *
 * Generated from catalog/catalog_full.json by scripts/generate-demo-listings.mjs.
 * Every listing's rarity, FX option, FragTrakr eligibility, conditions, and
 * festive flag is sourced from the canonical in-game catalog — do NOT
 * hand-edit; regenerate via the script when the catalog changes.
 *
 * Wired up when the API receives ?demo=1 (or detail with id="demo-*").
 * No DB writes. Inert in prod unless caller passes the flag explicitly.
 */

export interface DemoListing {
  id: string
  priceUsd: string
  minOfferUsd: string | null
  vaultItem: {
    id: string
    fingerprint: {
      rarity: string
      condition: string
      fx: string | null
      fragtrakr: boolean
      fragtrak_type: string | null
      kills: number
      festive: boolean
    }
    catalog: {
      id: string
      name: string
      weapon: string
      skin: string
      type: 'sniper' | 'knife'
      crate: string | null
      slug: null
    }
    owner: {
      id: string
      name: string
      displayName: string
      avatar: null
    }
  }
}

const LISTINGS: DemoListing[] = ${JSON.stringify(allListings, null, 2)}

export function getDemoListings(): DemoListing[] {
  return LISTINGS
}

export function findDemoListing(id: string): DemoListing | null {
  return LISTINGS.find(l => l.id === id) ?? null
}

export function isDemoId(id: string): boolean {
  return id.startsWith('demo-')
}
`

const outPath = path.join(projectRoot, 'lib', 'demoListings.ts')
fs.writeFileSync(outPath, tsBody)
console.log(`wrote ${outPath}`)
console.log(`  total listings: ${allListings.length}`)
const rarityBreakdown = {}
for (const l of allListings) {
  const r = l.vaultItem.fingerprint.rarity
  rarityBreakdown[r] = (rarityBreakdown[r] ?? 0) + 1
}
for (const [r, n] of Object.entries(rarityBreakdown)) console.log(`    ${r}: ${n}`)
const fxCount = allListings.filter(l => l.vaultItem.fingerprint.fx).length
const ftCount = allListings.filter(l => l.vaultItem.fingerprint.fragtrakr).length
console.log(`  with FX: ${fxCount}, with FragTrakr: ${ftCount}`)
