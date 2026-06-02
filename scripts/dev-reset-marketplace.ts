/**
 * Dev-only: wipe ALL item-marketplace runtime data so we can re-test the
 * deposit/listing/buy flow from a clean slate.
 *
 * Preserves: User, Order (non-item), ItemCatalog, CatalogCandidate, all gem flow.
 * Wipes: VaultItem, VendorItemListing, ItemDepositSession, ItemDeliveryJob,
 *        ItemWithdrawalJob, ItemStateLog, and any Order rows where type='item'.
 *
 * Refuses to run in production (NODE_ENV=production). Asks for --yes to confirm.
 *
 * Usage:  npx tsx scripts/dev-reset-marketplace.ts --yes
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import { prisma } from '../lib/prisma'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('refusing to run in production')
    process.exit(2)
  }
  if (!process.argv.includes('--yes')) {
    console.error('Wipes ALL VaultItem / Listing / Job / Session / item-Order rows.')
    console.error('Pass --yes to confirm.')
    process.exit(2)
  }

  // Order matters — children before parents.
  const r1 = await prisma.itemDeliveryJob.deleteMany({})
  const r2 = await prisma.itemWithdrawalJob.deleteMany({})
  const r3 = await prisma.itemDepositSession.deleteMany({})
  const r4 = await prisma.vendorItemListing.deleteMany({})
  const r5 = await prisma.itemStateLog.deleteMany({})
  const r6 = await prisma.vaultItem.deleteMany({})
  const r7 = await prisma.order.deleteMany({ where: { type: 'item' } })

  console.log('Wiped:')
  console.log(`  ItemDeliveryJob:    ${r1.count}`)
  console.log(`  ItemWithdrawalJob:  ${r2.count}`)
  console.log(`  ItemDepositSession: ${r3.count}`)
  console.log(`  VendorItemListing:  ${r4.count}`)
  console.log(`  ItemStateLog:       ${r5.count}`)
  console.log(`  VaultItem:          ${r6.count}`)
  console.log(`  Order (type=item):  ${r7.count}`)

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e); await prisma.$disconnect(); process.exit(1)
})
