import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, expireStaleDeposits, getSiteSettings } from '@/lib/storage'
import { createDepositIntent } from '@/lib/pandabase'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getSiteSettings()
    if (settings.depositsDisabled) {
      return NextResponse.json({ error: 'Deposits are currently disabled' }, { status: 403 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 500) {
      return NextResponse.json(
        { error: 'Amount must be between $1 and $500' },
        { status: 400 }
      )
    }

    // Round to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100

    // Expire stale deposits before checking limit
    await expireStaleDeposits()

    // Limit pending deposits to prevent Pandabase invoice spam
    const pendingDeposits = (await getUserDeposits(user.id)).filter(d => d.status === 'pending')
    if (pendingDeposits.length >= 3) {
      return NextResponse.json(
        { error: 'You already have 3 pending deposits. Please complete or wait for them to expire.' },
        { status: 429 }
      )
    }

    // Create Pandabase checkout
    const { checkoutUrl, invoiceId } = await createDepositIntent(roundedAmount)

    // Store deposit record
    const deposit = await createDeposit({
      userId: user.id,
      amount: roundedAmount,
      status: 'pending',
      pandabaseInvoiceId: invoiceId,
      pandabaseCheckoutUrl: checkoutUrl,
    })

    return NextResponse.json({
      depositId: deposit.id,
      checkoutUrl,
    })
  } catch (error) {
    console.error('Deposit creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create deposit' },
      { status: 500 }
    )
  }
}
