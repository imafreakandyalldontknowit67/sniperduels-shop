/**
 * Nightly auto-sync between sniperduelsvalues.com (the community catalog dump)
 * and our ItemCatalog DB. Runs as a Coolify scheduled task.
 *
 * Two-way reconciliation:
 *   1. Refresh data/item-catalog.json from the bot's scrape
 *      (or accept a pre-generated file). Upsert each entry into ItemCatalog.
 *   2. For every NEW item just added, look for matching pending
 *      CatalogCandidates by ocrName and auto-approve them (the values site
 *      confirms the item exists in-game — bot's OCR was right).
 *   3. For every existing pending candidate with no matching catalog row,
 *      try fuzzy-matching against the values-site dump for late approvals.
 *
 * Usage:  npx tsx scripts/sync-catalog-from-values.ts
 *         npx tsx scripts/sync-catalog-from-values.ts --regen   (re-scrapes first)
 *
 * Idempotent. Run as often as desired; cheap when nothing changed.
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

interface CatalogJson {
  name: string
  weapon: string
  skin: string
  type: 'sniper' | 'knife'
  crate: string | null
  slug: string
  valuesUrl: string
}

const args = new Set(process.argv.slice(2))
const REGEN = args.has('--regen')

async function main() {
  const catalogPath = path.join(process.cwd(), 'data', 'item-catalog.json')

  if (REGEN) {
    console.log('Regenerating data/item-catalog.json from bot scrape …')
    execSync('node scripts/generate-item-catalog.mjs', { stdio: 'inherit' })
  }
  if (!fs.existsSync(catalogPath)) {
    console.error(`Missing ${catalogPath}. Run with --regen first.`)
    process.exit(1)
  }
  const items: CatalogJson[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
  console.log(`Source: ${items.length} items from JSON`)

  // 1) Upsert each item into ItemCatalog. Track newly-inserted vs existing.
  const newlyInserted = new Set<string>()
  for (const it of items) {
    const before = await prisma.itemCatalog.findUnique({ where: { name: it.name }, select: { id: true } })
    await prisma.itemCatalog.upsert({
      where: { name: it.name },
      create: {
        name: it.name,
        weapon: it.weapon.toUpperCase(),
        skin: it.skin.toUpperCase(),
        type: it.type,
        crate: it.crate,
        slug: it.slug,
        source: 'sniperduelsvalues',
      },
      update: {
        crate: it.crate,
        slug: it.slug,
        // Don't downgrade source: a 'bot_observed' entry stays that way even
        // if the values site later picks it up. Just refresh metadata.
      },
    })
    if (!before) newlyInserted.add(it.name)
  }
  console.log(`Catalog upserts: created=${newlyInserted.size} existing=${items.length - newlyInserted.size}`)

  // 2) Auto-approve any pending candidate whose ocrName matches a NEW catalog row.
  //    These are items the bot saw before the values site listed them — once
  //    the site confirms, we promote without waiting for the observation count.
  let approvedFromNewSync = 0
  if (newlyInserted.size > 0) {
    const pending = await prisma.catalogCandidate.findMany({
      where: { status: 'pending', ocrName: { in: Array.from(newlyInserted) } },
    })
    for (const c of pending) {
      const catalog = await prisma.itemCatalog.findUnique({ where: { name: c.ocrName }, select: { id: true } })
      if (catalog) {
        await prisma.catalogCandidate.update({
          where: { id: c.id },
          data: { status: 'approved', approvedAsId: catalog.id, notes: 'auto-approved by values-site sync' },
        })
        approvedFromNewSync++
      }
    }
  }

  // 3) Also auto-approve any candidate whose ocrName matches an EXISTING
  //    catalog row (handles the case where the values site already had the
  //    item before the bot first saw it). The /api/bot/v1/catalog-candidate
  //    POST handler short-circuits this case for fresh sightings, but old
  //    pending candidates (created before that path) need this back-fill.
  const remainingPending = await prisma.catalogCandidate.findMany({
    where: { status: 'pending' },
    select: { id: true, ocrName: true },
  })
  let approvedFromBackfill = 0
  for (const c of remainingPending) {
    const catalog = await prisma.itemCatalog.findUnique({ where: { name: c.ocrName }, select: { id: true } })
    if (catalog) {
      await prisma.catalogCandidate.update({
        where: { id: c.id },
        data: { status: 'approved', approvedAsId: catalog.id, notes: 'auto-approved by values-site backfill' },
      })
      approvedFromBackfill++
    }
  }

  const totalCatalog = await prisma.itemCatalog.count()
  const pendingCount = await prisma.catalogCandidate.count({ where: { status: 'pending' } })
  console.log('---')
  console.log(`Auto-approved from new sync: ${approvedFromNewSync}`)
  console.log(`Auto-approved from backfill: ${approvedFromBackfill}`)
  console.log(`Catalog total: ${totalCatalog}`)
  console.log(`Candidates still pending (admin review): ${pendingCount}`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
