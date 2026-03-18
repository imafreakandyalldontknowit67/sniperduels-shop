import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUser, createVendorDeposit, getVendorDeposits, getVendorListing } from '@/lib/storage'

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

    const body = await request.json()
    const { amountK } = body

    if (!amountK || typeof amountK !== 'number' || !Number.isInteger(amountK) || amountK < 1) {
      return NextResponse.json({ error: 'amountK must be a positive integer' }, { status: 400 })
    }

    const deposit = await createVendorDeposit(user.id, amountK)
    return NextResponse.json({ deposit })
  } catch (error) {
    console.error('Vendor deposits POST error:', error)
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}
