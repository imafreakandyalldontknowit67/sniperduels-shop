import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getVendors, getUser, setVendorStatus, getVendorListing, getVendorEarningsSummary, deleteVendorListing, updateVendorPlatformFeeRate } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendors = await getVendors()

    // 30d summary for all vendors in one query (for sorting)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const recent30d = await prisma.vendorEarning.groupBy({
      by: ['vendorId'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
      _sum: { saleAmount: true },
    })
    const recentMap = new Map(recent30d.map(r => [r.vendorId, {
      count30d: r._count,
      gross30d: Number(r._sum.saleAmount ?? 0),
    }]))

    const vendorsWithDetails = await Promise.all(
      vendors.map(async (v) => {
        const listing = await getVendorListing(v.id)
        const earnings = await getVendorEarningsSummary(v.id)
        const recent = recentMap.get(v.id) || { count30d: 0, gross30d: 0 }
        return {
          id: v.id,
          name: v.name,
          displayName: v.displayName,
          avatar: v.avatar,
          listing: listing ? {
            pricePerK: listing.pricePerK,
            stockK: listing.stockK,
            active: listing.active,
            platformFeeRate: listing.platformFeeRate,
          } : null,
          earnings,
          recent,
        }
      })
    )

    return NextResponse.json({ vendors: vendorsWithDetails })
  } catch (error) {
    console.error('Admin vendors GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, action } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const targetUser = await getUser(userId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (action === 'add') {
      const updated = await setVendorStatus(userId, true)
      return NextResponse.json({ user: updated })
    } else if (action === 'remove') {
      await deleteVendorListing(userId)
      const updated = await setVendorStatus(userId, false)
      return NextResponse.json({ user: updated })
    }

    return NextResponse.json({ error: 'Invalid action. Use "add" or "remove"' }, { status: 400 })
  } catch (error) {
    console.error('Admin vendors POST error:', error)
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { vendorId, platformFeeRate } = body

    if (!vendorId || typeof vendorId !== 'string') {
      return NextResponse.json({ error: 'vendorId required' }, { status: 400 })
    }

    // null = reset to default 3%
    let rate: number | null = null
    if (platformFeeRate !== null && platformFeeRate !== undefined && platformFeeRate !== '') {
      rate = Number(platformFeeRate) / 100 // Convert percentage to decimal (e.g. 1.5 → 0.015)
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        return NextResponse.json({ error: 'platformFeeRate must be 0-100%' }, { status: 400 })
      }
    }

    const updated = await updateVendorPlatformFeeRate(vendorId, rate)
    if (!updated) {
      return NextResponse.json({ error: 'Vendor listing not found' }, { status: 404 })
    }

    return NextResponse.json({ listing: updated })
  } catch (error) {
    console.error('Admin vendors PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update vendor fee rate' }, { status: 500 })
  }
}
