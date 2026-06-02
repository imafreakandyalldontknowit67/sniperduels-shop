/**
 * End-to-end smoke test for the item marketplace flow.
 *
 * Verifies (with rollback at the end):
 *   1. Seed: catalog item + 2 users + 1 vault item owned by seller
 *   2. List item at $5.00
 *   3. Buyer purchases via wallet
 *   4. Bot job-poll returns the delivery
 *   5. Bot marks delivery completed → seller wallet credited, order completed
 *   6. Refund path: simulate failed delivery → wallet restored, listing unlocked
 *
 * Cleans up everything at the end (best-effort).
 *
 * Usage:  npx tsx scripts/smoke-marketplace.ts
 */
// Load env BEFORE any import that touches lib/prisma — that module instantiates
// the connection at import time. Failing to load .env first → SASL error.
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import { prisma } from '../lib/prisma'
import { purchaseListing, refundListingPurchase } from '../lib/marketplace'

function ok(label: string, cond: boolean, extra?: string) {
  console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  if (!cond) process.exitCode = 1
}

async function main() {
  const suffix = Math.random().toString(36).slice(2, 8)
  const sellerId = `smoke-seller-${suffix}`
  const buyerId = `smoke-buyer-${suffix}`
  const catalogName = `SMOKE | TESTITEM_${suffix.toUpperCase()}`

  console.log(`Smoke run id=${suffix}`)

  // 1. Seed
  const seller = await prisma.user.create({
    data: {
      id: sellerId,
      name: `seller_${suffix}`,
      displayName: `seller_${suffix}`,
      walletBalance: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
  })
  const buyer = await prisma.user.create({
    data: {
      id: buyerId,
      name: `buyer_${suffix}`,
      displayName: `buyer_${suffix}`,
      walletBalance: 10,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    },
  })
  const catalog = await prisma.itemCatalog.create({
    data: {
      name: catalogName,
      weapon: 'SMOKE',
      skin: `TESTITEM_${suffix.toUpperCase()}`,
      type: 'sniper',
      source: 'manual',
    },
  })
  const vaultItem = await prisma.vaultItem.create({
    data: {
      ownerId: sellerId,
      catalogId: catalog.id,
      fingerprint: { rarity: 'EPIC', condition: 'MINT CONDITION', kills: 0 },
      status: 'listed',
      listedAt: new Date(),
    },
  })
  const listing = await prisma.vendorItemListing.create({
    data: {
      vaultItemId: vaultItem.id,
      priceUsd: 5.0,
    },
  })

  // 2. Buyer purchases via wallet
  const purchase = await purchaseListing({
    listingId: listing.id,
    buyerId,
    buyerRobloxName: `buyer_${suffix}`,
    method: 'wallet',
  })
  ok('purchase returns wallet_paid', purchase.status === 'wallet_paid')
  ok('purchase returns delivery id', !!purchase.deliveryJobId)

  // Verify state mutations
  const buyerAfter = await prisma.user.findUnique({ where: { id: buyerId } })
  ok('buyer wallet debited to $5', Number(buyerAfter?.walletBalance) === 5)
  const vaultAfter = await prisma.vaultItem.findUnique({ where: { id: vaultItem.id } })
  ok('vault item reserved', vaultAfter?.status === 'reserved')
  const orderAfter = await prisma.order.findUnique({ where: { id: purchase.orderId } })
  ok('order status processing (wallet path)', orderAfter?.status === 'processing')

  // 3. Bot job-poll equivalent — should see the delivery
  const polled = await prisma.itemDeliveryJob.findFirst({
    where: { id: purchase.deliveryJobId, status: 'queued' },
  })
  ok('delivery job queued and visible', !!polled)
  // Simulate poll filter — order must be processing/completed
  const pollableOrder = await prisma.order.findUnique({ where: { id: purchase.orderId } })
  ok('poll-filter passes (status processing)',
    pollableOrder?.status === 'processing' || pollableOrder?.status === 'completed')

  // 4. Simulate bot completes delivery (mirrors the route's transaction)
  await prisma.$transaction(async tx => {
    await tx.itemDeliveryJob.update({
      where: { id: purchase.deliveryJobId },
      data: { status: 'completed', completedAt: new Date() },
    })
    await tx.vaultItem.update({
      where: { id: vaultItem.id },
      data: { status: 'sold', soldAt: new Date() },
    })
    const platformFee = +(5 * 0.03).toFixed(2)
    const netAmount = +(5 - platformFee).toFixed(2)
    // Ledger row first then SET LOCAL guard then UPDATE — DB trigger requires it.
    await tx.transactionLedger.create({
      data: {
        type: 'vendor_earning',
        userId: sellerId,
        amount: netAmount,
        description: `Item sold via order ${purchase.orderId}`,
        relatedId: purchase.orderId,
        createdAt: new Date().toISOString(),
      },
    })
    await tx.$executeRawUnsafe(`SET LOCAL app.allow_wallet_change = 'true'`)
    await tx.user.update({
      where: { id: sellerId },
      data: { walletBalance: { increment: netAmount } },
    })
    await tx.order.update({
      where: { id: purchase.orderId },
      data: { status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    })
  })

  const sellerAfter = await prisma.user.findUnique({ where: { id: sellerId } })
  ok('seller wallet credited net (3% fee)', Number(sellerAfter?.walletBalance) === 4.85,
    `actual $${Number(sellerAfter?.walletBalance)}`)
  const finalVault = await prisma.vaultItem.findUnique({ where: { id: vaultItem.id } })
  ok('vault status sold', finalVault?.status === 'sold')

  // 5. Refund path — second test on a new listing
  const vault2 = await prisma.vaultItem.create({
    data: {
      ownerId: sellerId,
      catalogId: catalog.id,
      fingerprint: { rarity: 'RARE' },
      status: 'listed',
      listedAt: new Date(),
    },
  })
  const listing2 = await prisma.vendorItemListing.create({
    data: { vaultItemId: vault2.id, priceUsd: 3.0 },
  })
  const buyer2Before = await prisma.user.findUnique({ where: { id: buyerId } })
  const purchase2 = await purchaseListing({
    listingId: listing2.id,
    buyerId,
    buyerRobloxName: `buyer_${suffix}`,
    method: 'wallet',
  })
  ok('second purchase debits wallet',
    Number((await prisma.user.findUnique({ where: { id: buyerId } }))?.walletBalance) ===
    Number(buyer2Before?.walletBalance) - 3)
  const refundResult = await refundListingPurchase(purchase2.orderId, 'smoke: simulated bot failure')
  ok('refund completes (not alreadyRefunded)', !refundResult.alreadyRefunded)
  const buyerAfterRefund = await prisma.user.findUnique({ where: { id: buyerId } })
  ok('buyer wallet restored after refund',
    Number(buyerAfterRefund?.walletBalance) === Number(buyer2Before?.walletBalance),
    `wallet=$${Number(buyerAfterRefund?.walletBalance)} expected=$${Number(buyer2Before?.walletBalance)}`)
  const vault2After = await prisma.vaultItem.findUnique({ where: { id: vault2.id } })
  ok('vault item unlocked back to listed', vault2After?.status === 'listed')

  // Idempotency: refund again
  const refundAgain = await refundListingPurchase(purchase2.orderId, 'idempotency check')
  ok('refund is idempotent', refundAgain.alreadyRefunded === true)

  // 6. Self-purchase blocked
  try {
    await purchaseListing({
      listingId: listing2.id,  // listing back to active after refund
      buyerId: sellerId,        // seller buying own listing
      buyerRobloxName: 'self',
      method: 'wallet',
    })
    ok('self-purchase blocked', false, 'should have thrown')
  } catch (err: any) {
    ok('self-purchase blocked', err.code === 'SELF_PURCHASE', `got ${err.code}`)
  }

  // Cleanup
  console.log('\nCleaning up…')
  await prisma.itemDeliveryJob.deleteMany({ where: { buyerUserId: buyerId } })
  await prisma.vendorItemListing.deleteMany({ where: { vaultItemId: { in: [vaultItem.id, vault2.id] } } })
  await prisma.vaultItem.deleteMany({ where: { id: { in: [vaultItem.id, vault2.id] } } })
  await prisma.order.deleteMany({ where: { userId: buyerId } })
  await prisma.transactionLedger.deleteMany({ where: { userId: { in: [buyerId, sellerId] } } })
  await prisma.itemCatalog.delete({ where: { id: catalog.id } }).catch(() => {})
  await prisma.user.delete({ where: { id: buyerId } }).catch(() => {})
  await prisma.user.delete({ where: { id: sellerId } }).catch(() => {})
  console.log('Cleanup done.')

  await prisma.$disconnect()
  process.exit(process.exitCode || 0)
}

main().catch(async e => {
  console.error('SMOKE FAILED:', e)
  await prisma.$disconnect()
  process.exit(1)
})
