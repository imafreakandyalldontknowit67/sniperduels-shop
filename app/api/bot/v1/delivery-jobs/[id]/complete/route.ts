/**
 * Bot reports a successful delivery. Marks VaultItem sold, ItemDeliveryJob
 * completed, and the associated Order completed. Credits seller wallet.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateBot } from '@/lib/bot-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const job = await prisma.itemDeliveryJob.findUnique({
    where: { id },
    include: { vaultItem: { include: { owner: true } } },
  })
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.status === 'completed') {
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  // Pull the Order for the sale amount + seller wallet credit
  const order = await prisma.order.findUnique({ where: { id: job.orderId } })

  await prisma.$transaction(async tx => {
    await tx.itemDeliveryJob.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    })
    await tx.vaultItem.update({
      where: { id: job.vaultItemId },
      data: { status: 'sold', soldAt: new Date() },
    })
    if (order && order.status !== 'completed') {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      })
      // Credit seller wallet (minus platform fee — same 3% default as gem vendors).
      const PLATFORM_FEE_RATE = 0.03
      const saleAmount = Number(order.totalPrice)
      const platformFee = +(saleAmount * PLATFORM_FEE_RATE).toFixed(2)
      const netAmount = +(saleAmount - platformFee).toFixed(2)
      const sellerId = job.vaultItem.ownerId
      // Ledger row first; SET LOCAL allow_wallet_change; then balance bump.
      // DB trigger refuses any User.walletBalance UPDATE that's not paired
      // with a ledger entry inside the same transaction.
      await tx.transactionLedger.create({
        data: {
          type: 'vendor_earning',
          userId: sellerId,
          amount: netAmount,
          description: `Item sold: ${job.vaultItem.catalogId} via order ${order.id}`,
          relatedId: order.id,
          createdAt: new Date().toISOString(),
        },
      })
      await tx.$executeRawUnsafe(`SET LOCAL app.allow_wallet_change = 'true'`)
      await tx.user.update({
        where: { id: sellerId },
        data: { walletBalance: { increment: netAmount } },
      })
    }
  })

  return NextResponse.json({ ok: true })
}
