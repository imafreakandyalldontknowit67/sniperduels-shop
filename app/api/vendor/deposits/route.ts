import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, createVendorDeposit, getVendorDeposits, getVendorListing, createOrder } from '@/lib/storage'
import { getBotLastHeartbeat } from '@/lib/bot-heartbeat'

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

    const deposits = await getVendorDeposits(user.id)
    return NextResponse.json({ deposits })
  } catch (error) {
    console.error('Vendor deposits GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 })
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

    // Vendor must have a listing first
    const listing = await getVendorListing(user.id)
    if (!listing) {
      return NextResponse.json({ error: 'Set up your listing first before depositing gems' }, { status: 400 })
    }

    const lastHeartbeat = getBotLastHeartbeat()
    if (Date.now() - lastHeartbeat > 60_000) {
      return NextResponse.json(
        { error: 'The trade bot is currently offline. Please try again later.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { amountK } = body

    if (!amountK || typeof amountK !== 'number' || !Number.isInteger(amountK) || amountK < 1) {
      return NextResponse.json({ error: 'amountK must be a positive integer' }, { status: 400 })
    }

    // Create a VendorDeposit record to track the deposit
    const deposit = await createVendorDeposit(user.id, amountK)

    // Create a regular Order so it enters the bot queue
    // The bot will process this like any order — vendor joins server, bot receives gems
    const order = await createOrder({
      userId: user.id,
      userName: user.name,
      type: 'gems',
      itemName: `Vendor Deposit: ${amountK}k Gems`,
      quantity: amountK,
      pricePerUnit: 0,
      totalPrice: 0,
      status: 'pending',
      notes: `vendor-deposit:${deposit.id}`,
    })

    return NextResponse.json({ deposit, order })
  } catch (error) {
    console.error('Vendor deposits POST error:', error)
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}
