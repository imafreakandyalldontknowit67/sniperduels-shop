/**
 * List the current user's vault — items the bot holds for them.
 * Includes catalog joins + listing status + active job state.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.vaultItem.findMany({
    where: {
      ownerId: user.id,
      status: { in: ['deposited', 'listed', 'reserved', 'withdrawing'] },
    },
    include: {
      catalog: { select: { name: true, weapon: true, skin: true, type: true, crate: true } },
      listing: { select: { id: true, priceUsd: true, active: true, createdAt: true } },
      delivery: { select: { id: true, status: true, attempts: true } },
      withdrawal: { select: { id: true, status: true } },
    },
    orderBy: { depositedAt: 'desc' },
  })

  return NextResponse.json(
    { items, count: items.length },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
