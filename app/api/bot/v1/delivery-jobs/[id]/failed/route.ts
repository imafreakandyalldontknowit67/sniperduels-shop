/**
 * Bot reports a failed delivery attempt. If retryable, returns the job to
 * 'queued' so the next poll picks it up. After 3 failures, marks 'failed'
 * permanently and unlocks the VaultItem (status: reserved → listed) so the
 * marketplace can re-sell or the user can withdraw.
 *
 * Body: { reason: string, retryable?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateBot } from '@/lib/bot-auth'
import { prisma } from '@/lib/prisma'

const MAX_ATTEMPTS = 3

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  let body: any = {}
  try { body = await request.json() } catch { /* ok */ }
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : 'unknown'
  const retryable = body.retryable !== false

  const job = await prisma.itemDeliveryJob.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const shouldRetry = retryable && job.attempts < MAX_ATTEMPTS

  await prisma.$transaction(async tx => {
    if (shouldRetry) {
      // Return to queue. Next poll picks it up.
      await tx.itemDeliveryJob.update({
        where: { id },
        data: { status: 'queued', lastError: reason },
      })
    } else {
      // Permanent failure. Unlock VaultItem so the marketplace can re-sell
      // or the buyer can get refunded.
      await tx.itemDeliveryJob.update({
        where: { id },
        data: { status: 'failed', lastError: reason, completedAt: new Date() },
      })
      // VaultItem goes back to 'listed' (the listing is still active) so
      // marketplace flow continues. Order remains 'processing' — admin
      // refunds manually or via a future auto-refund worker.
      await tx.vaultItem.update({
        where: { id: job.vaultItemId },
        data: { status: 'listed' },
      })
    }
  })

  return NextResponse.json({ ok: true, willRetry: shouldRetry })
}
