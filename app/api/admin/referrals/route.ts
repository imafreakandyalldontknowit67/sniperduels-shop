import { NextResponse } from 'next/server'
import { getSession, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session || !isAdmin(session.user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Get all user IDs involved
  const userIds = [...new Set([
    ...referrals.map(r => r.referrerUserId),
    ...referrals.map(r => r.referredUserId),
  ])]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(users.map(u => [u.id, u.name]))

  // Top referrers
  const referrerCounts = new Map<string, { count: number; earned: number }>()
  for (const r of referrals) {
    const entry = referrerCounts.get(r.referrerUserId) || { count: 0, earned: 0 }
    entry.count++
    if (r.commissionAmount) entry.earned += Number(r.commissionAmount)
    referrerCounts.set(r.referrerUserId, entry)
  }
  const topReferrers = [...referrerCounts.entries()]
    .map(([id, data]) => ({ name: nameMap.get(id) || id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return NextResponse.json({
    referrals: referrals.map(r => ({
      id: r.id,
      referrerName: nameMap.get(r.referrerUserId) || r.referrerUserId,
      referredName: nameMap.get(r.referredUserId) || r.referredUserId,
      status: r.status,
      commission: r.commissionAmount ? Number(r.commissionAmount) : null,
      createdAt: r.createdAt,
      creditedAt: r.creditedAt,
    })),
    topReferrers,
    totals: {
      totalReferrals: referrals.length,
      totalCredited: referrals.filter(r => r.status === 'credited').length,
      totalCommissionPaid: referrals.reduce((sum, r) => sum + (r.commissionAmount ? Number(r.commissionAmount) : 0), 0),
    },
  })
}
