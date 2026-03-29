import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, getWalletBalance, getVendorPayouts, createVendorPayout } from '@/lib/storage'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fullUser = await getUser(user.id)
    if (!fullUser || !fullUser.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const [payouts, balance] = await Promise.all([
      getVendorPayouts(user.id),
      getWalletBalance(user.id),
    ])

    return NextResponse.json({ payouts, balance })
  } catch (error) {
    console.error('Vendor payouts error:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const fullUser = await getUser(user.id)
    if (!fullUser || !fullUser.isVendor) {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    const body = await request.json()
    const { amount, paymentMethod } = body

    if (!amount || typeof amount !== 'number' || amount < 1) {
      return NextResponse.json({ error: 'Amount must be at least $1' }, { status: 400 })
    }

    if (!paymentMethod || typeof paymentMethod !== 'string' || paymentMethod.trim().length === 0) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    }

    if (paymentMethod.length > 500) {
      return NextResponse.json({ error: 'Payment method too long' }, { status: 400 })
    }

    const roundedAmount = Math.round(amount * 100) / 100

    const payout = await createVendorPayout(user.id, roundedAmount, paymentMethod.trim())
    if (!payout) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    return NextResponse.json({ payout, newBalance: await getWalletBalance(user.id) })
  } catch (error) {
    console.error('Vendor payout request error:', error)
    return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 })
  }
}
