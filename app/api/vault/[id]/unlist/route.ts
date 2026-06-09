/**
 * User unlists their item. Flips VaultItem listed → deposited.
 * (The listing record stays but is set inactive — preserves history.)
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
  const item = await prisma.vaultItem.findUnique({ where: { id }, include: { listing: true } })
  if (!item || item.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (item.status !== 'listed') {
    return NextResponse.json({ error: `Cannot unlist — status is ${item.status}` }, { status: 409 })
  }

  await prisma.$transaction(async tx => {
    if (item.listing) {
      await tx.vendorItemListing.update({
        where: { id: item.listing.id },
        data: { active: false },
      })
    }
    await tx.vaultItem.update({
      where: { id: item.id },
      data: { status: 'deposited' },
    })
  })
  return NextResponse.json({ ok: true })
}
