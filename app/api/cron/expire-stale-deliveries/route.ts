/**
 * Cron: ItemDeliveryJob stuck in 'bot_in_trade' for >30 min → return to
 * 'queued'. Bot crashed or lost connection mid-trade; next poll re-picks.
 *
 * Also flips ItemDepositSession from 'bot_in_trade' to 'cancelled' after
 * the same 30-min stale threshold — user gave up or bot crashed.
 *
 * Auth: x-cron-secret header (Coolify scheduled task supplies it).
 * Schedule recommendation: every 5 minutes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

const STALE_AFTER_MS = 30 * 60_000

function authenticateCron(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || !process.env.CRON_SECRET) return false
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(process.env.CRON_SECRET))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const staleCutoff = new Date(Date.now() - STALE_AFTER_MS)

  // Re-queue stuck deliveries.
  const reQueuedDeliveries = await prisma.itemDeliveryJob.updateMany({
    where: {
      status: 'bot_in_trade',
      startedAt: { lt: staleCutoff },
    },
    data: {
      status: 'queued',
      lastError: 'auto-requeued by stale-job cron',
    },
  })

  // Re-queue stuck withdrawals same logic.
  const reQueuedWithdrawals = await prisma.itemWithdrawalJob.updateMany({
    where: {
      status: 'bot_in_trade',
      startedAt: { lt: staleCutoff },
    },
    data: {
      status: 'queued',
      lastError: 'auto-requeued by stale-job cron',
    },
  })

  // Cancel stuck deposit sessions. Vault items: there are none yet (deposit
  // hasn't completed), so no unlock needed.
  const cancelledSessions = await prisma.itemDepositSession.updateMany({
    where: {
      status: { in: ['bot_in_trade', 'awaiting_confirm'] },
      createdAt: { lt: staleCutoff },
    },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: 'auto-cancelled — stuck >30 min',
    },
  })

  // Expire pending deposit sessions whose expiresAt has passed.
  const expiredSessions = await prisma.itemDepositSession.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  })

  return NextResponse.json({
    ok: true,
    reQueuedDeliveries: reQueuedDeliveries.count,
    reQueuedWithdrawals: reQueuedWithdrawals.count,
    cancelledSessions: cancelledSessions.count,
    expiredSessions: expiredSessions.count,
  })
}

export async function GET(request: NextRequest) {
  // Some cron services only support GET. Delegate.
  return POST(request)
}
