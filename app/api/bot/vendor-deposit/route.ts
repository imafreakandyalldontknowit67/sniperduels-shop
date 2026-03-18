import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getVendorDeposit, updateVendorDepositStatus, addVendorStock, getPendingVendorDeposits } from '@/lib/storage'

function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY)
    )
  } catch {
    return false
  }
}

// GET: Bot fetches pending vendor deposits (deposit queue)
export async function GET(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const deposits = await getPendingVendorDeposits()
  return NextResponse.json({ deposits })
}

// POST: Bot confirms gem receipt from vendor
export async function POST(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { depositId, vendorId, amountK } = body

    if (!depositId || !vendorId || !amountK) {
      return NextResponse.json(
        { error: 'depositId, vendorId, and amountK are required' },
        { status: 400 }
      )
    }

    // Fetch deposit first and validate ownership BEFORE any mutations
    const deposit = await getVendorDeposit(depositId)
    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    // IDOR prevention: verify deposit belongs to the specified vendor
    if (deposit.vendorId !== vendorId) {
      return NextResponse.json(
        { error: 'Deposit does not belong to specified vendor' },
        { status: 403 }
      )
    }

    // Replay prevention: only process pending/queued deposits
    if (deposit.status !== 'pending' && deposit.status !== 'queued') {
      return NextResponse.json(
        { error: `Deposit already ${deposit.status}` },
        { status: 409 }
      )
    }

    // Now safe to mutate: mark deposit as completed
    const updated = await updateVendorDepositStatus(depositId, 'completed')
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update deposit status' }, { status: 500 })
    }

    // Add gems to vendor's stock
    const listing = await addVendorStock(vendorId, amountK)
    if (!listing) {
      return NextResponse.json(
        { error: 'Vendor listing not found. Deposit marked complete but stock not updated.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      deposit: updated,
      newStockK: listing.stockK,
    })
  } catch (error) {
    console.error('Bot vendor-deposit error:', error)
    return NextResponse.json({ error: 'Failed to process vendor deposit' }, { status: 500 })
  }
}
