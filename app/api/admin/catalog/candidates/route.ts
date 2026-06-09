/**
 * Admin: list CatalogCandidates (default = pending review queue).
 *
 * Query: ?status=pending|approved|rejected|duplicate (default 'pending')
 *        ?limit=N (default 100)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status') ?? 'pending'
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500)
  const validStatuses = ['pending', 'approved', 'rejected', 'duplicate'] as const
  if (!validStatuses.includes(statusParam as any)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const candidates = await prisma.catalogCandidate.findMany({
    where: { status: statusParam as any },
    orderBy: [{ observedCount: 'desc' }, { lastSeenAt: 'desc' }],
    take: limit,
  })

  return NextResponse.json(
    { candidates, count: candidates.length },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
