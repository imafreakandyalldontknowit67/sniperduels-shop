import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, getOrders, getVendorListing, deductVendorStock, createOrder } from '@/lib/storage'
import { getBotLastHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

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

    const allOrders = await getOrders()
    const withdrawals = allOrders.filter(
      o => o.notes?.startsWith(`vendor-withdrawal:${user.id}`)
    )

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error('Vendor withdrawals GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    if (!listing) {
      return NextResponse.json({ error: 'Set up your listing first before withdrawing gems' }, { status: 400 })
    }

    const lastHeartbeat = await getBotLastHeartbeat()
    if (Date.now() - lastHeartbeat > BOT_OFFLINE_THRESHOLD_MS) {
      return NextResponse.json(
        { error: 'The trade bot is currently offline. Please try again later.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { amountK } = body

    if (!amountK || typeof amountK !== 'number' || !Number.isInteger(amountK) || amountK < 1 || amountK > 500) {
      return NextResponse.json({ error: 'amountK must be a positive integer between 1 and 500' }, { status: 400 })
    }

    if (listing.stockK < amountK) {
      return NextResponse.json({ error: 'Insufficient stock for withdrawal' }, { status: 400 })
    }

    // Check for existing pending withdrawal
    const allOrders = await getOrders()
    const pendingWithdrawal = allOrders.find(
      o => o.notes?.startsWith(`vendor-withdrawal:${user.id}`) && o.status === 'pending'
    )
    if (pendingWithdrawal) {
      return NextResponse.json({ error: 'You already have a pending withdrawal' }, { status: 400 })
    }

    // Deduct stock immediately
    const deducted = await deductVendorStock(user.id, amountK)
    if (!deducted) {
      return NextResponse.json({ error: 'Failed to deduct stock' }, { status: 500 })
    }

    // Create order for the bot queue
    const order = await createOrder({
      userId: user.id,
      userName: user.name,
      type: 'gems',
      itemName: `Vendor Withdrawal: ${amountK}k Gems`,
      quantity: amountK,
      pricePerUnit: 0,
      totalPrice: 0,
      status: 'pending',
      notes: `vendor-withdrawal:${user.id}`,
    })

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Vendor withdrawals POST error:', error)
    return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
  }
}
