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

  // 2. Delivery jobs — buyer paid, deliver the vault item(s).
  // ONLY pick up jobs whose Order has cleared payment (status in
  // processing|completed). Pandabase-pending Orders sit until the webhook
  // flips them to 'processing'.
  // BATCHED: a buyer who bought several items (cart) gets them all in ONE
  // trade. Find the oldest queued+paid delivery, then claim all of that
  // buyer's queued+paid deliveries (cap 12 = trade slot limit).
  const claimedDeliveries = await prisma.$transaction(async tx => {
    // Pull a window of the oldest queued deliveries, then filter to paid ones.
    const queued = await tx.itemDeliveryJob.findMany({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
      take: 60,
      include: { vaultItem: { include: { catalog: true } } },
    })
    if (queued.length === 0) return null
    const orderIds = [...new Set(queued.map(j => j.orderId))]
    const paidOrders = await tx.order.findMany({
      where: { id: { in: orderIds }, status: { in: ['processing', 'completed'] } },
      select: { id: true },
    })
    const paidSet = new Set(paidOrders.map(o => o.id))
    const paid = queued.filter(j => paidSet.has(j.orderId))
    if (paid.length === 0) return null  // nothing cleared payment yet
    // Group by buyer; take the buyer of the oldest paid job, cap 12.
    const first = paid[0]
    const forBuyer = paid.filter(j => j.buyerUserId === first.buyerUserId).slice(0, 12)
    const ids = forBuyer.map(j => j.id)
    const updated = await tx.itemDeliveryJob.updateMany({
      where: { id: { in: ids }, status: 'queued' },
      data: { status: 'bot_in_trade', startedAt: new Date(), attempts: { increment: 1 } },
    })
    return updated.count > 0 ? forBuyer : null
  })
  if (claimedDeliveries && claimedDeliveries.length > 0) {
    return NextResponse.json({
      kind: 'delivery',
      job: {
        buyerUserId: claimedDeliveries[0].buyerUserId,
        buyerRobloxName: claimedDeliveries[0].buyerRobloxName,
        items: claimedDeliveries.map(j => ({
          deliveryId: j.id,
          vaultItemId: j.vaultItemId,
          orderId: j.orderId,
          catalogId: j.vaultItem.catalogId,
          lastCellHint: j.vaultItem.lastCellHint,
          // Merge catalog name into the per-instance fingerprint so the bot has
          // the in-game name to search/match on (delivery = STRICT match).
          expectedFingerprint: {
            ...(j.expectedFingerprint as Record<string, unknown>),
            name: (j.expectedFingerprint as Record<string, unknown>)?.name
              ?? j.vaultItem.catalog.name,
          },
        })),
      },
    })
  }

  // 3. Withdrawal jobs — user requested their item back.
  // BATCHED: pick the user with the oldest queued withdrawal, then claim ALL
  // their queued withdrawals (cap 12 = trade slot limit) so the bot returns
  // every item in a SINGLE in-game trade. Far better UX than 1 trade/item.
  const claimedWithdrawals = await prisma.$transaction(async tx => {
    const first = await tx.itemWithdrawalJob.findFirst({
      where: { status: 'queued' },
      orderBy: { createdAt: 'asc' },
    })
    if (!first) return null
    const jobs = await tx.itemWithdrawalJob.findMany({
      where: { status: 'queued', userId: first.userId },
      orderBy: { createdAt: 'asc' },
      take: 12,
      include: { vaultItem: { include: { catalog: true } } },
    })
    const ids = jobs.map(j => j.id)
    const updated = await tx.itemWithdrawalJob.updateMany({
      where: { id: { in: ids }, status: 'queued' },
      data: {
        status: 'bot_in_trade',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    })
    return updated.count > 0 ? jobs : null
  })
  if (claimedWithdrawals && claimedWithdrawals.length > 0) {
    return NextResponse.json({
      kind: 'withdrawal',
      job: {
        userId: claimedWithdrawals[0].userId,
        userRobloxName: claimedWithdrawals[0].userRobloxName,
        items: claimedWithdrawals.map(j => ({
          withdrawalId: j.id,
          vaultItemId: j.vaultItemId,
          catalogId: j.vaultItem.catalogId,
          // Merge the catalog name into the per-instance fingerprint so the bot
          // has the in-game item name to search/match on (the stored fingerprint
          // blob is attributes-only — name lives on the ItemCatalog row).
          fingerprint: {
            ...(j.vaultItem.fingerprint as Record<string, unknown>),
            name: j.vaultItem.catalog.name,
          },
          lastCellHint: j.vaultItem.lastCellHint,
        })),
      },
    })
  }

  // Nothing to do.
  return NextResponse.json({ kind: null, job: null })
}
