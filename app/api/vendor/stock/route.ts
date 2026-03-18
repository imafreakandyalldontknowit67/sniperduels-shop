import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, getVendorListing } from '@/lib/storage'

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

    const listing = await getVendorListing(user.id)
    return NextResponse.json({
      stockK: listing?.stockK ?? 0,
      active: listing?.active ?? false,
      pricePerK: listing?.pricePerK ?? 0,
    })
  } catch (error) {
    console.error('Vendor stock GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 })
  }
}
