/**
 * Bot reports a successful withdrawal — the item was traded back to the user
 * in-game. Marks the ItemWithdrawalJob completed and the VaultItem 'withdrawn'.
 * Idempotent: a second call on an already-completed job is a no-op.
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

  const job = await prisma.itemWithdrawalJob.findUnique({ where: { id } })
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.status === 'completed') {
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  await prisma.$transaction(async tx => {
    await tx.itemWithdrawalJob.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    })
    await tx.vaultItem.update({
      where: { id: job.vaultItemId },
      data: { status: 'withdrawn', withdrawnAt: new Date() },
    })
  })

  return NextResponse.json({ ok: true })
}
