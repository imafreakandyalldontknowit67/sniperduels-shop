/**
 * Bot polls this endpoint to get its next job. Returns AT MOST ONE job and
 * atomically marks it 'bot_in_trade' / 'started' so concurrent bot instances
 * (or retry attempts after a reboot) don't double-pick.
 *
 * Priority order:
 *   1. ItemDepositSession (pending) — user is waiting to deposit
 *   2. ItemDeliveryJob (queued) — buyer paid, must deliver
 *   3. ItemWithdrawalJob (queued) — user wants their item back
 *
 * Within each kind, oldest first (FIFO).
 *
 * Returns shape:
 *   { kind: 'deposit'|'delivery'|'withdrawal'|null, job: {...} | null }
 *
 * No long-polling — bot polls every ~5s. (Server-Sent Events would be nicer
 * but Cloudflare's free tier is fussy about long-lived connections.)
 *
 * Auth: x-bot-api-key.
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { rateLimitOr429 } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY),
    )
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Hardening 9.7: cap bot poll rate. Bot daemon polls every 5s normally —
  // 30/min is generous and catches a leaked key being used to scrape jobs.
  const limited = rateLimitOr429(`bot-poll:${request.headers.get('x-bot-api-key')?.slice(0, 8) ?? 'anon'}`,
    { limit: 30, windowMs: 60_000 })
  if (limited) return limited

  // 1. Deposit sessions — user has joined, waiting for trade request.
  // Atomic claim: pending → bot_in_trade in one updateMany call.
  const claimedDeposit = await prisma.$transaction(async tx => {
    const candidate = await tx.itemDepositSession.findFirst({
      where: {
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    })
    if (!candidate) return null
    const updated = await tx.itemDepositSession.updateMany({
      where: { id: candidate.id, status: 'pending' },
      data: { status: 'bot_in_trade' },
    })
    return updated.count > 0 ? candidate : null
  })
  if (claimedDeposit) {
    return NextResponse.json({
      kind: 'deposit',
      job: {
        sessionId: claimedDeposit.id,
        userId: claimedDeposit.userId,
        robloxName: claimedDeposit.user.name,
        mode: claimedDeposit.mode,
        declaredItems: claimedDeposit.declaredItems,
      },
    })
  }

  // 2. Delivery jobs — buyer paid, deliver the vault item.
  // ONLY pick up jobs whose Order has cleared payment (status in
  // processing|completed). Pandabase-pending Orders sit until the webhook
  // flips them to 'processing'.
  const claimedDelivery = await prisma.$transaction(async tx => {
    const candidate = await tx.itemDeliveryJob.findFirst({
      where: {
        status: 'queued',
        // Inline order-status filter via a nested findFirst would be ideal,
        // but Prisma can't traverse cross-table on findFirst directly here.
        // We filter post-fetch instead and skip non-paid orders.
      },
      orderBy: { createdAt: 'asc' },
      include: { vaultItem: true },
    })
    if (!candidate) return null
    const order = await tx.order.findUnique({
      where: { id: candidate.orderId },
      select: { status: true },
    })
    if (!order || (order.status !== 'processing' && order.status !== 'completed')) {
      return null  // payment not cleared yet — skip this poll cycle
    }
    const updated = await tx.itemDeliveryJob.updateMany({
      where: { id: candidate.id, status: 'queued' },
      data: {
        status: 'bot_in_trade',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    })
    return updated.count > 0 ? candidate : null
  })
  if (claimedDelivery) {
    return NextResponse.json({
      kind: 'delivery',
      job: {
        deliveryId: claimedDelivery.id,
        vaultItemId: claimedDelivery.vaultItemId,
        buyerUserId: claimedDelivery.buyerUserId,
        buyerRobloxName: claimedDelivery.buyerRobloxName,
        orderId: claimedDelivery.orderId,
        expectedFingerprint: claimedDelivery.expectedFingerprint,
        catalogId: claimedDelivery.vaultItem.catalogId,
        lastCellHint: claimedDelivery.vaultItem.lastCellHint,
      },
    })
  }

  // 3. Withdrawal jobs — user requested their item back.
  const claimedWithdrawal = await prisma.$transaction(async tx => {
    const candidate = await tx.itemWithdrawalJob.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
      include: { vaultItem: true },
    })
    if (!candidate) return null
    const updated = await tx.itemWithdrawalJob.updateMany({
      where: { id: candidate.id, status: 'queued' },
      data: {
        status: 'bot_in_trade',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    })
    return updated.count > 0 ? candidate : null
  })
  if (claimedWithdrawal) {
    return NextResponse.json({
      kind: 'withdrawal',
      job: {
        withdrawalId: claimedWithdrawal.id,
        vaultItemId: claimedWithdrawal.vaultItemId,
        userId: claimedWithdrawal.userId,
        userRobloxName: claimedWithdrawal.userRobloxName,
        catalogId: claimedWithdrawal.vaultItem.catalogId,
        fingerprint: claimedWithdrawal.vaultItem.fingerprint,
        lastCellHint: claimedWithdrawal.vaultItem.lastCellHint,
      },
    })
  }

  // Nothing to do.
  return NextResponse.json({ kind: null, job: null })
}
