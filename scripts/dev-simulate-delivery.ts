/**
 * Dev-only: fake the bot completing a delivery for a given Order.id.
 *
 * Mirrors what POST /api/bot/v1/delivery-jobs/[id]/complete does, but lets
 * you trigger it from the CLI without needing the bot daemon running.
 *
 * Usage:  npx tsx scripts/dev-simulate-delivery.ts --order <orderId>
 *         npx tsx scripts/dev-simulate-delivery.ts --order <orderId> --fail "test failure"
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local', override: true })

import { prisma } from '../lib/prisma'
import { refundListingPurchase } from '../lib/marketplace'

async function main() {
  const argv = process.argv.slice(2)
  const orderIdx = argv.indexOf('--order')
  const failIdx = argv.indexOf('--fail')
  if (orderIdx < 0) {
    console.error('usage: --order <orderId> [--fail <reason>]')
    process.exit(2)
  }
  const orderId = argv[orderIdx + 1]
  const failReason = failIdx >= 0 ? argv[failIdx + 1] : null

  if (failReason) {
    const result = await refundListingPurchase(orderId, failReason)
    console.log('refund result:', result)
    await prisma.$disconnect(); return
  }

  // Success path — mirror the route's transaction.
  const job = await prisma.itemDeliveryJob.findUnique({
    where: { orderId },
    include: { vaultItem: { include: { catalog: true } } },
  })
  if (!job) {
    console.error(`no ItemDeliveryJob for order ${orderId}`)
    process.exit(2)
  }
  if (job.status === 'completed') {
    console.log('already completed')
    await prisma.$disconnect(); return
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) { console.error('order missing'); process.exit(2) }

  const saleAmount = Number(order.totalPrice)
  const platformFee = Math.round(saleAmount * 0.03 * 100) / 100
  const netAmount = Math.round((saleAmount - platformFee) * 100) / 100

  await prisma.$transaction(async tx => {
    await tx.itemDeliveryJob.update({
      where: { id: job.id },
      data: { status: 'completed', completedAt: new Date() },
    })
    await tx.vaultItem.update({
      where: { id: job.vaultItemId },
      data: { status: 'sold', soldAt: new Date() },
    })
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    await tx.transactionLedger.create({
      data: {
        type: 'vendor_earning',
        userId: job.vaultItem.ownerId,
        amount: netAmount,
        description: `Item sold: ${job.vaultItem.catalog.name} via order ${orderId}`,
        relatedId: orderId,
        createdAt: new Date().toISOString(),
      },
    })
    await tx.$executeRawUnsafe(`SET LOCAL app.allow_wallet_change = 'true'`)
    await tx.user.update({
      where: { id: job.vaultItem.ownerId },
      data: { walletBalance: { increment: netAmount } },
    })
  })

  console.log(`delivery ${job.id} completed`)
  console.log(`seller ${job.vaultItem.ownerId} credited $${netAmount}`)
  console.log(`order ${orderId} -> completed`)

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e); await prisma.$disconnect(); process.exit(1)
})
