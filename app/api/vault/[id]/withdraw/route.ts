/**
 * User requests their deposited item back. Creates an ItemWithdrawalJob,
 * flips VaultItem.status: deposited|listed → withdrawing. Bot polls for the
 * job and initiates the return trade.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const item = await prisma.vaultItem.findUnique({
    where: { id },
    include: { listing: true, delivery: true, withdrawal: true, owner: true },
  })
  if (!item || item.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (item.status === 'reserved') {
    return NextResponse.json({ error: 'Item locked — delivery in progress' }, { status: 409 })
  }
  if (item.status === 'sold' || item.status === 'withdrawn') {
    return NextResponse.json({ error: 'Item already gone' }, { status: 409 })
  }
  if (item.withdrawal && item.withdrawal.status !== 'failed') {
    return NextResponse.json({ ok: true, withdrawalId: item.withdrawal.id, alreadyQueued: true })
  }

  const job = await prisma.$transaction(async tx => {
    // Deactivate any active listing
    if (item.listing?.active) {
      await tx.vendorItemListing.update({
        where: { id: item.listing.id },
        data: { active: false },
      })
    }
    await tx.vaultItem.update({
      where: { id: item.id },
      data: { status: 'withdrawing' },
    })
    return tx.itemWithdrawalJob.create({
      data: {
        vaultItemId: item.id,
        userId: user.id,
        userRobloxName: item.owner.name,
      },
    })
  })

  return NextResponse.json({ ok: true, withdrawalId: job.id })
}
