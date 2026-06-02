/**
 * Item catalog — the universe of items that can be listed on sniperduels.shop.
 *
 * Sourced from the item-bot's scraped catalog (sniperduelsvalues.com), 215 unique
 * items across 16 weapon types. Regenerate via:
 *     node scripts/generate-item-catalog.mjs
 *
 * The bot OCRs item names as "WEAPON | SKIN" (uppercase) and snaps against this
 * catalog to canonicalize. On the site we display Title Case but the canonical
 * matching key remains the uppercase pipe-form.
 */
import catalogJson from '@/data/item-catalog.json'

export interface CatalogItem {
  /** Canonical display name in uppercase pipe form — "AWP | FRANKENAWP GREEN".
   *  Use this as the lookup/match key (the bot reports this format from OCR). */
  name: string
  /** Title-cased weapon, e.g. "Awp", "Intervention", "Bayonet". */
  weapon: string
  /** Title-cased skin, e.g. "Black Valk". */
  skin: string
  /** 'sniper' | 'knife' — determines display category in the shop. */
  type: 'sniper' | 'knife'
  /** Origin crate (Classic Case, Skin Case #1, Halloween 2025 Collectable, …)
   *  or null for cases where the item has no associated crate. */
  crate: string | null
  /** sniperduelsvalues.com slug, e.g. "halloween-2025-collectable-awp-frankenawp-green". */
  slug: string
  /** Cross-reference URL for value lookup. */
  valuesUrl: string
}

const catalog: CatalogItem[] = catalogJson as CatalogItem[]

/** All catalog entries, sorted by weapon then skin. */
export function allItems(): CatalogItem[] {
  return catalog
}

/** Lookup by canonical uppercase pipe name — fast path for bot-reported names. */
export function findByName(name: string): CatalogItem | undefined {
  const u = name.trim().toUpperCase()
  return catalog.find(it => it.name === u)
}

/** Items of a single type, useful for shop filters. */
export function byType(t: 'sniper' | 'knife'): CatalogItem[] {
  return catalog.filter(it => it.type === t)
}

/** Skins available for a given weapon (uppercased). Used for autocomplete in
 *  the admin add-item form to constrain to real combinations. */
export function skinsForWeapon(weapon: string): string[] {
  const w = weapon.trim().toUpperCase()
  return catalog
    .filter(it => it.name.startsWith(`${w} | `))
    .map(it => it.skin)
    .sort()
}

/** All unique weapon names (uppercase), useful for the weapon-select dropdown. */
export function allWeapons(): string[] {
  const set = new Set<string>()
  for (const it of catalog) {
    set.add(it.name.split(' | ')[0])
  }
  return Array.from(set).sort()
}

/** All unique crates, for the crate-filter dropdown. */
export function allCrates(): string[] {
  const set = new Set<string>()
  for (const it of catalog) {
    if (it.crate) set.add(it.crate)
  }
  return Array.from(set).sort()
}

/** Stats for sanity checks / admin overview. */
export function catalogStats() {
  const byWeapon: Record<string, number> = {}
  const byCrate: Record<string, number> = {}
  for (const it of catalog) {
    byWeapon[it.weapon] = (byWeapon[it.weapon] || 0) + 1
    if (it.crate) byCrate[it.crate] = (byCrate[it.crate] || 0) + 1
  }
  return {
    total: catalog.length,
    snipers: catalog.filter(c => c.type === 'sniper').length,
    knives: catalog.filter(c => c.type === 'knife').length,
    weapons: Object.keys(byWeapon).length,
    crates: Object.keys(byCrate).length,
    byWeapon,
    byCrate,
  }
}
