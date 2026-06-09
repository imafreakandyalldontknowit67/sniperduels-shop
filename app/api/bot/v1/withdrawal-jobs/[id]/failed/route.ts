/**
 * Bot reports a failed withdrawal attempt. If retryable and under the attempt
 * cap, returns the job to 'queued' for the next poll. Otherwise marks it
 * 'failed' and returns the VaultItem to 'deposited' (it's still in the bot's
 * custody — the withdrawal just couldn't complete, so the user keeps it in vault).
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

  const job = await prisma.itemWithdrawalJob.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const shouldRetry = retryable && job.attempts < MAX_ATTEMPTS

  await prisma.$transaction(async tx => {
    if (shouldRetry) {
      await tx.itemWithdrawalJob.update({
        where: { id },
        data: { status: 'queued', lastError: reason },
      })
    } else {
      await tx.itemWithdrawalJob.update({
        where: { id },
        data: { status: 'failed', lastError: reason, completedAt: new Date() },
      })
      // Item is still in custody — return it to the vault as 'deposited'.
      await tx.vaultItem.update({
        where: { id: job.vaultItemId },
        data: { status: 'deposited' },
      })
    }
  })

  return NextResponse.json({ ok: true, willRetry: shouldRetry })
}
