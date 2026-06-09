#!/usr/bin/env node
// Convert the item-bot's scraped catalog (217 items from sniperduelsvalues.com)
// into a site-friendly seed: data/item-catalog.json.
//
// This is the universe of items that CAN be listed. StockItem rows are the
// subset the bot actually holds. The admin "Add item" UI uses this catalog for
// autocomplete; vendor-deposit listings use it to map OCR'd names → canonical
// display names.
//
// Source-of-truth path is the item-bot repo:
//   C:/Users/imbou/Downloads/Programs/sniperduels-item-bot/catalog/catalog.json
//
// Run: node scripts/generate-item-catalog.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BOT_CATALOG = 'C:/Users/imbou/Downloads/Programs/sniperduels-item-bot/catalog/catalog.json'
const OUT = path.join(__dirname, '..', 'data', 'item-catalog.json')

// Weapon → item type. Snipers shoot, melee weapons are knives/blunt.
const KNIFE_LIKE = new Set([
  'BAYONET', 'KATANA', 'KARAMBIT', 'BUTTERFLY',
  'CANDY CANE', 'BOMBLINE', 'PAN', 'CASH MONEY',
])

function classifyType(weapon) {
  if (KNIFE_LIKE.has(weapon)) return 'knife'
  return 'sniper'
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

const raw = JSON.parse(fs.readFileSync(BOT_CATALOG, 'utf8'))

const items = raw.map(e => ({
  // Canonical display name — what users see + what the bot OCRs back.
  name: `${e.weapon} | ${e.skin}`,
  weapon: titleCase(e.weapon),
  skin: titleCase(e.skin),
  type: classifyType(e.weapon),
  crate: e.crate || null,
  // sniperduelsvalues.com slug, for cross-reference / current-value lookup.
  slug: e.slug,
  valuesUrl: `https://sniperduelsvalues.com/item/${e.slug}`,
}))

// Dedupe by canonical name (the catalog can have the same item from different crate URLs)
const byName = new Map()
for (const it of items) {
  if (!byName.has(it.name)) byName.set(it.name, it)
}
const unique = Array.from(byName.values()).sort((a, b) =>
  a.weapon.localeCompare(b.weapon) || a.skin.localeCompare(b.skin),
)

fs.writeFileSync(OUT, JSON.stringify(unique, null, 2) + '\n')

// Summary
const byWeapon = {}
const byType = { sniper: 0, knife: 0 }
for (const it of unique) {
  byWeapon[it.weapon] = (byWeapon[it.weapon] || 0) + 1
  byType[it.type]++
}
console.log(`Wrote ${unique.length} items to ${path.relative(process.cwd(), OUT)}`)
console.log(`Types: snipers=${byType.sniper}, knives=${byType.knife}`)
console.log('Per weapon:')
for (const [w, n] of Object.entries(byWeapon).sort()) {
  console.log(`  ${w.padEnd(14)} ${n}`)
}
