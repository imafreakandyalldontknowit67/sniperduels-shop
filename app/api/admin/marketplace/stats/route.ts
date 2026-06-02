/**
 * Admin marketplace stats — counts for the dashboard widget.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const since24h = new Date(Date.now() - 24 * 60 * 60_000)
  const [
    catalogTotal,
    candidatePending,
    vaultDeposited,
    vaultListed,
    vaultReserved,
    deliveryQueued,
    deliveryInTrade,
    deliveryFailedToday,
    soldToday,
    depositSessionsActive,
  ] = await Promise.all([
    prisma.itemCatalog.count(),
    prisma.catalogCandidate.count({ where: { status: 'pending' } }),
    prisma.vaultItem.count({ where: { status: 'deposited' } }),
    prisma.vaultItem.count({ where: { status: 'listed' } }),
    prisma.vaultItem.count({ where: { status: 'reserved' } }),
    prisma.itemDeliveryJob.count({ where: { status: 'queued' } }),
    prisma.itemDeliveryJob.count({ where: { status: 'bot_in_trade' } }),
    prisma.itemDeliveryJob.count({
      where: { status: 'failed', completedAt: { gte: since24h } },
    }),
    prisma.vaultItem.count({ where: { status: 'sold', soldAt: { gte: since24h } } }),
    prisma.itemDepositSession.count({
      where: { status: { in: ['pending', 'bot_in_trade', 'awaiting_confirm'] } },
    }),
  ])

  return NextResponse.json(
    {
      catalog: { total: catalogTotal, pending: candidatePending },
      vault: { deposited: vaultDeposited, listed: vaultListed, reserved: vaultReserved },
      jobs: {
        deliveryQueued, deliveryInTrade, deliveryFailedToday,
        soldToday, depositSessionsActive,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
