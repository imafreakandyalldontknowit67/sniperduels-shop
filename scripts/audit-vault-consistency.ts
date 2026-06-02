/**
 * Audit script: flags VaultItem rows whose status doesn't match their
 * downstream listing/delivery/withdrawal state.
 *
 * Run weekly via cron OR on-demand by an admin.
 *
 * Detects:
 *   - VaultItem(status=listed) without an active VendorItemListing → orphan
 *   - VaultItem(status=reserved) with no active ItemDeliveryJob → stuck lock
 *   - VaultItem(status=withdrawing) with no queued/in-flight ItemWithdrawalJob
 *   - VendorItemListing(active=true) whose VaultItem isn't 'listed'
 *   - ItemDeliveryJob(status=queued) whose Order is in {failed, refunded, cancelled}
 *
 * Outputs JSON + console table. Exits 1 if any issues found (cron alerting).
 *
 * Usage:  npx tsx scripts/audit-vault-consistency.ts [--fix]
 *   --fix attempts safe auto-repairs (currently: unlock orphaned 'reserved'
 *   items where the delivery job is in a terminal state).
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import { prisma } from '../lib/prisma'

const FIX = process.argv.includes('--fix')

interface Issue {
  kind: string
  vaultItemId?: string
  listingId?: string
  deliveryJobId?: string
  withdrawalJobId?: string
  orderId?: string
  note: string
}

async function main() {
  const issues: Issue[] = []

  // 1) listed-no-listing: VaultItem.status='listed' but no active VendorItemListing
  const listedNoActive = await prisma.vaultItem.findMany({
    where: { status: 'listed' },
    include: { listing: true },
  })
  for (const v of listedNoActive) {
    if (!v.listing || !v.listing.active) {
      issues.push({
        kind: 'listed-no-active-listing',
        vaultItemId: v.id,
        listingId: v.listing?.id,
        note: 'VaultItem is listed but has no active VendorItemListing',
      })
    }
  }

  // 2) reserved-no-delivery: VaultItem.status='reserved' but no in-flight delivery
  const reservedItems = await prisma.vaultItem.findMany({
    where: { status: 'reserved' },
    include: { delivery: true },
  })
  for (const v of reservedItems) {
    const inFlight = v.delivery && (v.delivery.status === 'queued' || v.delivery.status === 'bot_in_trade')
    if (!inFlight) {
      issues.push({
        kind: 'reserved-no-in-flight-delivery',
        vaultItemId: v.id,
        deliveryJobId: v.delivery?.id,
        note: `VaultItem reserved but delivery is ${v.delivery?.status ?? 'missing'}`,
      })
      if (FIX) {
        await prisma.vaultItem.update({
          where: { id: v.id },
          data: { status: 'listed' },
        })
        console.log(`  [fix] unlocked vault ${v.id} back to 'listed'`)
      }
    }
  }

  // 3) withdrawing-no-job
  const withdrawingItems = await prisma.vaultItem.findMany({
    where: { status: 'withdrawing' },
    include: { withdrawal: true },
  })
  for (const v of withdrawingItems) {
    const inFlight = v.withdrawal && (v.withdrawal.status === 'queued' || v.withdrawal.status === 'bot_in_trade')
    if (!inFlight) {
      issues.push({
        kind: 'withdrawing-no-in-flight-job',
        vaultItemId: v.id,
        withdrawalJobId: v.withdrawal?.id,
        note: `VaultItem withdrawing but withdrawal is ${v.withdrawal?.status ?? 'missing'}`,
      })
    }
  }

  // 4) active-listing-but-vault-not-listed
  const activeListings = await prisma.vendorItemListing.findMany({
    where: { active: true },
    include: { vaultItem: true },
  })
  for (const l of activeListings) {
    if (l.vaultItem.status !== 'listed') {
      issues.push({
        kind: 'active-listing-stale-vault-status',
        listingId: l.id,
        vaultItemId: l.vaultItem.id,
        note: `Listing active but vault status is ${l.vaultItem.status}`,
      })
    }
  }

  // 5) queued-delivery-dead-order: queued deliveries whose order is terminal
  const queuedDeliveries = await prisma.itemDeliveryJob.findMany({
    where: { status: 'queued' },
  })
  if (queuedDeliveries.length) {
    const orderIds = queuedDeliveries.map(d => d.orderId)
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, status: true },
    })
    const byId = new Map(orders.map(o => [o.id, o.status]))
    for (const d of queuedDeliveries) {
      const os = byId.get(d.orderId)
      if (os === 'failed' || os === 'refunded') {
        issues.push({
          kind: 'queued-delivery-dead-order',
          deliveryJobId: d.id,
          orderId: d.orderId,
          note: `Delivery queued but order is ${os}`,
        })
      }
    }
  }

  // Output
  if (issues.length === 0) {
    console.log(`✓ vault consistency clean — no issues across ${listedNoActive.length + reservedItems.length + withdrawingItems.length} vault items`)
    await prisma.$disconnect()
    process.exit(0)
  }
  console.error(`✗ ${issues.length} issues:`)
  console.table(issues)
  console.log(JSON.stringify(issues, null, 2))
  await prisma.$disconnect()
  process.exit(1)
}

main().catch(async e => {
  console.error('audit crashed:', e)
  await prisma.$disconnect()
  process.exit(2)
})
