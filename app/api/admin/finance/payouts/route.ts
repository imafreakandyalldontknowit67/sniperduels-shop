import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getPendingPayouts, getVendorPayouts } from '@/lib/storage'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [pending, all] = await Promise.all([
      getPendingPayouts(),
      getVendorPayouts(),
    ])

    return NextResponse.json({ pending, all })
  } catch (error) {
    console.error('Admin payouts error:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}
