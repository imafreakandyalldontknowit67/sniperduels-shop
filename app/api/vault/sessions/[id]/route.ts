/**
 * Poll deposit-session status. User's vault UI hits this every few seconds
 * while waiting for the bot to complete the trade.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const session = await prisma.itemDepositSession.findUnique({ where: { id } })
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Also return the user's new VaultItems if completed — frontend can show
  // them immediately without another roundtrip.
  let vaultItems: any[] = []
  if (session.status === 'completed' && session.completedAt) {
    vaultItems = await prisma.vaultItem.findMany({
      where: {
        ownerId: user.id,
        depositedAt: { gte: new Date(session.completedAt.getTime() - 60_000) },
      },
      include: { catalog: { select: { name: true, type: true, crate: true } } },
      orderBy: { depositedAt: 'desc' },
    })
  }

  return NextResponse.json(
    { session, vaultItems },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
