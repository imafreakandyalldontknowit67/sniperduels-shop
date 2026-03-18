import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, getVendorEarnings, getVendorEarningsSummary } from '@/lib/storage'

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

    return NextResponse.json({ earnings, summary })
  } catch (error) {
    console.error('Vendor earnings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
  }
}
