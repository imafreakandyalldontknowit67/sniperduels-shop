/**
 * Hardcoded marketplace listings for UX preview ONLY.
 *
 * Wired up when the API receives ?demo=1 (or detail with id="demo-*").
 * No DB writes. Inert in prod unless caller passes the flag explicitly.
 *
 * Names match entries in lib/itemIcon.ts so icons resolve. To regenerate
 * with new items, pick names from public/items/ filenames.
 */

export interface DemoListing {
  id: string
  priceUsd: string
  minOfferUsd: string | null
  vaultItem: {
    id: string
    fingerprint: any
    catalog: {
      id: string
      name: string
      weapon: string
      skin: string
      type: 'sniper' | 'knife'
      crate: string | null
      slug: string | null
    }
    owner: {
      id: string
      name: string
      displayName: string
      avatar: string | null
    }
  }
}

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
] as const

function seller(i: number) {
  const [name, display] = SELLERS[i % SELLERS.length]
  return { id: `demo-user-${i % SELLERS.length}`, name, displayName: display, avatar: null }
}

interface Spec {
  name: string             // "AWP | CERULEAN OZYMANDIAS"
  type: 'sniper' | 'knife'
  rarity: string           // "LEGENDARY"
  price: number
  crate?: string | null
  condition?: string
  fx?: string | null
  fragtrakr?: boolean
  kills?: number
  quickscope?: number
  exist?: number
  festive?: boolean
}

function buildListing(idx: number, spec: Spec): DemoListing {
  const [weapon, skin] = spec.name.split(' | ')
  return {
    id: `demo-${idx.toString().padStart(3, '0')}`,
    priceUsd: spec.price.toFixed(2),
    minOfferUsd: spec.price > 20 ? (spec.price * 0.85).toFixed(2) : null,
    vaultItem: {
      id: `demo-vault-${idx}`,
      fingerprint: {
        rarity: spec.rarity,
        condition: spec.condition ?? 'STANDARD ISSUE',
        fx: spec.fx ?? null,
        fragtrakr: spec.fragtrakr ?? false,
        kills: spec.kills ?? 0,
        quickscope_kills: spec.quickscope ?? null,
        exist: spec.exist ?? null,
        festive: spec.festive ?? false,
      },
      catalog: {
        id: `demo-cat-${idx}`,
        name: spec.name,
        weapon,
        skin,
        type: spec.type,
        crate: spec.crate ?? null,
        slug: null,
      },
      owner: seller(idx),
    },
  }
}

const SPECS: Spec[] = [
  // ── Top tier showcase ──
  { name: 'AWP | CERULEAN OZYMANDIAS', type: 'sniper', rarity: 'SECRET', price: 189.99, crate: 'Pyramid Case', fx: 'CERULEAN', kills: 2310, quickscope: 412, fragtrakr: true, condition: 'MINT CONDITION', exist: 27 },
  { name: 'AWP | EMPYREUS',             type: 'sniper', rarity: 'SECRET', price: 165.00, crate: 'Empyreus Case', fx: 'NYAN', kills: 1840, condition: 'MINT CONDITION', exist: 33 },
  { name: 'INTERVENTION | BLACK VALK',  type: 'sniper', rarity: 'LEGENDARY', price: 142.50, crate: 'Valkyrie Case', fx: 'RETRO EXPLODE', kills: 980, condition: 'WELL WORN', fragtrakr: true, exist: 41 },
  { name: 'KARAMBIT | AURORA',          type: 'knife', rarity: 'LEGENDARY', price: 89.99, crate: 'Aurora Case', fx: 'BOREALIS', kills: 412, exist: 88, condition: 'STANDARD ISSUE' },
  { name: 'BAYONET | CRIMSON WEB',      type: 'knife', rarity: 'LEGENDARY', price: 78.00, crate: 'Classic Case', kills: 612, exist: 124, condition: 'MINT CONDITION', fragtrakr: true },
  { name: 'BUTTERFLY | DARKSTEEL',      type: 'knife', rarity: 'LEGENDARY', price: 67.50, crate: 'Butterfly Case', kills: 1023, fx: 'STORM' },

  // ── Mid tier ──
  { name: 'AWP | INFERNUS',             type: 'sniper', rarity: 'EPIC', price: 54.99, crate: 'Infernus Case', fx: 'FIRE', kills: 760, condition: 'WELL WORN', fragtrakr: true },
  { name: 'AWP | BOREALIS',             type: 'sniper', rarity: 'EPIC', price: 49.95, crate: 'Northern Case', fx: 'BOREALIS', kills: 540, condition: 'MINT CONDITION' },
  { name: 'AWP | RAINBOW RUNNER',       type: 'sniper', rarity: 'EPIC', price: 47.00, fx: 'RAINBOW', kills: 1200 },
  { name: 'AWP | HYSOID',               type: 'sniper', rarity: 'EPIC', price: 44.50, kills: 89, condition: 'STANDARD ISSUE' },
  { name: 'AWP | SHOGUN',               type: 'sniper', rarity: 'EPIC', price: 42.00, crate: 'Samurai Case', kills: 612 },
  { name: 'KARAMBIT | CASE HARDENED',   type: 'knife', rarity: 'EPIC', price: 39.99, crate: 'Classic Case', kills: 240, condition: 'STANDARD ISSUE' },
  { name: 'BUTTERFLY | CHERRY',         type: 'knife', rarity: 'EPIC', price: 37.50, kills: 145, fx: 'PETALS' },
  { name: 'KARAMBIT | NEBULEUM',        type: 'knife', rarity: 'EPIC', price: 34.99, fx: 'NEBULA', kills: 89 },
  { name: 'BAYONET | RUBY',             type: 'knife', rarity: 'EPIC', price: 33.00, crate: 'Gem Case' },
  { name: 'AWP | DRIFTER',              type: 'sniper', rarity: 'EPIC', price: 30.00, kills: 412, condition: 'WELL WORN' },

  // ── Mid-low ──
  { name: 'AWP | FANTASY',              type: 'sniper', rarity: 'RARE', price: 19.99, kills: 240, condition: 'MINT CONDITION', fx: 'SPARKLE' },
  { name: 'AWP | DYNASTY',              type: 'sniper', rarity: 'RARE', price: 18.50, kills: 88 },
  { name: 'AWP | FRUTIGER AERO',        type: 'sniper', rarity: 'RARE', price: 17.00, kills: 412, condition: 'STANDARD ISSUE' },
  { name: 'AWP | JEWEL',                type: 'sniper', rarity: 'RARE', price: 16.49 },
  { name: 'BAYONET | AURORA',           type: 'knife', rarity: 'RARE', price: 15.99, kills: 120 },
  { name: 'KARAMBIT | MALACHITE',       type: 'knife', rarity: 'RARE', price: 14.50 },
  { name: 'BUTTERFLY | BLUE CAMO',      type: 'knife', rarity: 'RARE', price: 13.99, kills: 67 },
  { name: 'AWP | NEW YEARS 2026',       type: 'sniper', rarity: 'COLLECTABLE', price: 22.50, crate: 'New Years 2026', kills: 12, festive: true },

  // ── Festive / collectables ──
  { name: 'AWP | PEPPERMINT',           type: 'sniper', rarity: 'COLLECTABLE', price: 28.00, crate: 'Holiday 2025 Collectable', festive: true, fx: 'SNOW', kills: 89 },
  { name: 'AWP | BEWITCHED',            type: 'sniper', rarity: 'COLLECTABLE', price: 21.50, crate: 'Halloween 2025 Collectable', kills: 0, festive: true },
  { name: 'BAYONET | PEPPERMINT',       type: 'knife', rarity: 'COLLECTABLE', price: 19.99, festive: true, kills: 40 },
  { name: 'KARAMBIT | PEPPERMINT',      type: 'knife', rarity: 'COLLECTABLE', price: 18.49, festive: true },

  // ── Knives ──
  { name: 'BAYONET | EMERALD',          type: 'knife', rarity: 'EPIC', price: 26.99, crate: 'Gem Case', fx: 'GLOW' },
  { name: 'BAYONET | ONYX',             type: 'knife', rarity: 'EPIC', price: 25.50 },
  { name: 'BAYONET | SAPPHIRE',         type: 'knife', rarity: 'EPIC', price: 24.99 },
  { name: 'BUTTERFLY | DAMASCUS',       type: 'knife', rarity: 'EPIC', price: 23.00, kills: 240 },
  { name: 'KARAMBIT | KOI',             type: 'knife', rarity: 'RARE', price: 11.99, kills: 60 },
  { name: 'KARAMBIT | TIGER',           type: 'knife', rarity: 'RARE', price: 10.49 },

  // ── Cheap / uncommon ──
  { name: 'AWP | VANILLA',              type: 'sniper', rarity: 'UNCOMMON', price: 4.99, kills: 1240 },
  { name: 'BAYONET | VANILLA',          type: 'knife', rarity: 'UNCOMMON', price: 3.49 },
  { name: 'KARAMBIT | SUNSET',          type: 'knife', rarity: 'UNCOMMON', price: 5.99 },
  { name: 'AWP | RED SPIRAL',           type: 'sniper', rarity: 'UNCOMMON', price: 6.50 },
  { name: 'AWP | WHITE SPIRAL',         type: 'sniper', rarity: 'UNCOMMON', price: 6.00 },
  { name: 'AWP | INVERTED',             type: 'sniper', rarity: 'UNCOMMON', price: 5.49 },
  { name: 'BUTTERFLY | VANILLA',        type: 'knife', rarity: 'UNCOMMON', price: 4.99 },

  // ── Cheapest ──
  { name: 'AWP | FOR HER',              type: 'sniper', rarity: 'COMMON', price: 1.99 },
  { name: 'AWP | FOR HIM',              type: 'sniper', rarity: 'COMMON', price: 1.99 },
  { name: 'AWP | TRUE PINK',            type: 'sniper', rarity: 'COMMON', price: 2.49 },
  { name: 'AWP | TRUE INVERTED',        type: 'sniper', rarity: 'COMMON', price: 2.99 },

  // ── Variants of headline skins (for "same skin" funnel) ──
  { name: 'AWP | CERULEAN OZYMANDIAS', type: 'sniper', rarity: 'SECRET', price: 159.99, crate: 'Pyramid Case', kills: 120,  condition: 'STANDARD ISSUE', exist: 27 },
  { name: 'AWP | CERULEAN OZYMANDIAS', type: 'sniper', rarity: 'SECRET', price: 142.50, crate: 'Pyramid Case', fragtrakr: true, kills: 0, condition: 'MINT CONDITION', exist: 27 },
  { name: 'INTERVENTION | BLACK VALK', type: 'sniper', rarity: 'LEGENDARY', price: 119.99, crate: 'Valkyrie Case', kills: 220, condition: 'STANDARD ISSUE' },
  { name: 'INTERVENTION | BLACK VALK', type: 'sniper', rarity: 'LEGENDARY', price: 108.00, crate: 'Valkyrie Case', kills: 0, condition: 'MINT CONDITION', fx: 'RETRO EXPLODE' },
  { name: 'KARAMBIT | AURORA',         type: 'knife',  rarity: 'LEGENDARY', price: 74.99, kills: 0, condition: 'MINT CONDITION' },
  { name: 'KARAMBIT | AURORA',         type: 'knife',  rarity: 'LEGENDARY', price: 79.50, fragtrakr: true, kills: 100, condition: 'STANDARD ISSUE' },
  { name: 'BAYONET | CRIMSON WEB',     type: 'knife',  rarity: 'LEGENDARY', price: 64.00, kills: 0, condition: 'MINT CONDITION' },
  { name: 'BAYONET | CRIMSON WEB',     type: 'knife',  rarity: 'LEGENDARY', price: 71.50, kills: 240, condition: 'WELL WORN' },
  { name: 'AWP | INFERNUS',            type: 'sniper', rarity: 'EPIC',     price: 47.50, fx: 'FIRE', kills: 0, condition: 'MINT CONDITION' },
  { name: 'AWP | INFERNUS',            type: 'sniper', rarity: 'EPIC',     price: 39.99, kills: 1200, condition: 'WELL WORN' },
]

const LISTINGS: DemoListing[] = SPECS.map((s, i) => buildListing(i, s))

export function getDemoListings(): DemoListing[] {
  return LISTINGS
}

export function findDemoListing(id: string): DemoListing | null {
  return LISTINGS.find(l => l.id === id) ?? null
}

export function isDemoId(id: string): boolean {
  return id.startsWith('demo-')
}
