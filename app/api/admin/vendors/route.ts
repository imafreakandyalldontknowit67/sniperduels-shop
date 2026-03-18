import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getVendors, getUser, setVendorStatus, getVendorListing, getVendorEarningsSummary } from '@/lib/storage'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendors = await getVendors()
    const vendorsWithDetails = await Promise.all(
      vendors.map(async (v) => {
        const listing = await getVendorListing(v.id)
        const earnings = await getVendorEarningsSummary(v.id)
        return {
          id: v.id,
          name: v.name,
          displayName: v.displayName,
          avatar: v.avatar,
          listing: listing ? {
            pricePerK: listing.pricePerK,
            stockK: listing.stockK,
            active: listing.active,
          } : null,
          earnings,
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
      const updated = await setVendorStatus(userId, false)
      return NextResponse.json({ user: updated })
    }

    return NextResponse.json({ error: 'Invalid action. Use "add" or "remove"' }, { status: 400 })
  } catch (error) {
    console.error('Admin vendors POST error:', error)
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
  }
}
