import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, getVendorEarnings, getVendorEarningsSummary } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await getUser(user.id)
    if (!dbUser?.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const earnings = await getVendorEarnings(user.id)
    const summary = await getVendorEarningsSummary(user.id)

    // Calculate monthly rank among all vendors
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const monthlyTotals = await prisma.vendorEarning.groupBy({
      by: ['vendorId'],
      where: { createdAt: { gte: monthStart } },
      _sum: { netAmount: true },
      _count: true,
    })

    const sorted = monthlyTotals
      .map(v => ({ vendorId: v.vendorId, volume: Number(v._sum.netAmount ?? 0) }))
      .sort((a, b) => b.volume - a.volume)

    const myIndex = sorted.findIndex(v => v.vendorId === user.id)
    const monthlyRank = myIndex >= 0 ? myIndex + 1 : null
    const totalVendors = sorted.length

    return NextResponse.json({ earnings, summary, monthlyRank, totalVendors })
  } catch (error) {
    console.error('Vendor earnings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
  }
}
