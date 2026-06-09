/**
 * Seed the ItemCatalog table from data/item-catalog.json (the bot's
 * scraped catalog of 215 items from sniperduelsvalues.com).
 *
 * Idempotent — uses upsert on `name`. Safe to re-run after the nightly
 * generate-item-catalog.mjs to ingest new items the community site added.
 *
 * Usage:  npx tsx scripts/seed-item-catalog.ts
 */
import fs from 'fs'
import path from 'path'
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

async function main() {
  const fp = path.join(process.cwd(), 'data', 'item-catalog.json')
  if (!fs.existsSync(fp)) {
    console.error(`Missing ${fp} — run scripts/generate-item-catalog.mjs first.`)
    process.exit(1)
  }
  const items: CatalogJson[] = JSON.parse(fs.readFileSync(fp, 'utf-8'))
  console.log(`Loaded ${items.length} catalog entries from JSON.`)

  let created = 0
  let updated = 0
  for (const it of items) {
    const result = await prisma.itemCatalog.upsert({
      where: { name: it.name },  // canonical "WEAPON | SKIN" uppercase
      create: {
        name: it.name,
        // weapon/skin in JSON are Title Case; DB stores uppercase to match bot OCR
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
        // Only refresh metadata; don't downgrade source — a bot_observed
        // item that later appears on the values site stays bot_observed.
      },
    })
    if (result.firstSeenAt.getTime() > Date.now() - 5000) {
      created++
    } else {
      updated++
    }
  }

  const total = await prisma.itemCatalog.count()
  console.log(`Seed complete: created=${created} updated=${updated} (DB total=${total})`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
