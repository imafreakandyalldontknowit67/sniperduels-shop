#!/usr/bin/env node
/**
 * Regenerate lib/itemIcon.ts from public/items/*.png and the item bot's
 * catalog_full.json. Run after copying new icons into public/items/.
 *
 *   node scripts/build-icon-manifest.mjs [path/to/catalog_full.json]
 *
 * Defaults to ../sniperduels-item-bot/catalog/catalog_full.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const iconsDir = path.join(projectRoot, 'public', 'items')
const catalogArg = process.argv[2]
const catalogPath = catalogArg
  ? path.resolve(catalogArg)
  : path.resolve(projectRoot, '..', 'sniperduels-item-bot', 'catalog', 'catalog_full.json')

if (!fs.existsSync(catalogPath)) {
  console.error(`Catalog not found: ${catalogPath}`)
  process.exit(1)
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
const items = catalog.skins ?? catalog.items ?? []
const files = new Set(fs.readdirSync(iconsDir))

function canon(s) {
  return s.toLowerCase().replace(/[\s_\-.]/g, '')
}

const fileCanonMap = new Map()
for (const f of files) {
  fileCanonMap.set(canon(f.replace(/\.png$/, '')), f)
}

const manifest = {}
const unmatched = []
for (const it of items) {
  const w = it.weapon
  const s = it.skin
  const wTitle = w.split(' ').map(p => p[0] + p.slice(1).toLowerCase()).join('_')
  const sTitle = s.split(' ').map(p => p[0] + p.slice(1).toLowerCase()).join('_')
  const candidates = [
    `${w}_${s.replace(/ /g, '_')}.png`,
    `${wTitle}_${sTitle}.png`,
    `${w.replace(/ /g, '_')}_${s.replace(/ /g, '_')}.png`,
  ]
  let found = null
  for (const c of candidates) if (files.has(c)) { found = c; break }
  if (!found) {
    const key = canon(w + s)
    if (fileCanonMap.has(key)) found = fileCanonMap.get(key)
  }
  if (found) manifest[it.name] = found
  else unmatched.push(it.name)
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
const tsOut = `/**
 * Maps a catalog item name (pipe form: "AWP | CERULEAN OZYMANDIAS") to the
 * URL of its icon under /public/items/. Falls back to null when the icon
 * isn't in the manifest (UI shows weapon/skin text instead).
 *
 * Manifest is built from the bot's catalog/icons/ directory by
 * scripts/build-icon-manifest.mjs. To regenerate, copy the latest icons into
 * public/items/ and re-run the script.
 */

const ICONS: Record<string, string> = ${JSON.stringify(sorted, null, 2)}

export function iconUrl(catalogName: string | null | undefined): string | null {
  if (!catalogName) return null
  const file = ICONS[catalogName.toUpperCase()]
  return file ? \`/items/\${file}\` : null
}

export function hasIcon(catalogName: string | null | undefined): boolean {
  if (!catalogName) return false
  return Boolean(ICONS[catalogName.toUpperCase()])
}

export function iconCount(): number {
  return Object.keys(ICONS).length
}
`
const outPath = path.join(projectRoot, 'lib', 'itemIcon.ts')
fs.writeFileSync(outPath, tsOut)
console.log(`wrote ${outPath}`)
console.log(`  matched: ${Object.keys(manifest).length}`)
console.log(`  unmatched: ${unmatched.length}`)
if (unmatched.length) {
  console.log('  unmatched items:')
  for (const u of unmatched.slice(0, 10)) console.log(`    - ${u}`)
  if (unmatched.length > 10) console.log(`    ... and ${unmatched.length - 10} more`)
}
