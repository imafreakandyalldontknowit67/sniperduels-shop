import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, expireStaleDeposits } from '@/lib/storage'
import { createDepositIntent, BillingInfo } from '@/lib/pandabase'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, billing } = body

    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 500) {
      return NextResponse.json(
        { error: 'Amount must be between $1 and $500' },
        { status: 400 }
      )
    }

    // Validate billing fields
    if (!billing || typeof billing !== 'object') {
      return NextResponse.json(
        { error: 'Billing information is required' },
        { status: 400 }
      )
    }

    const requiredFields = ['email', 'address', 'city', 'state', 'zip'] as const
    for (const field of requiredFields) {
      if (!billing[field] || typeof billing[field] !== 'string' || !billing[field].trim()) {
        return NextResponse.json(
          { error: `Billing ${field} is required` },
          { status: 400 }
        )
      }
    }

    const billingInfo: BillingInfo = {
      email: billing.email.trim(),
      address: billing.address.trim(),
      address2: billing.address2?.trim() || '',
      city: billing.city.trim(),
      state: billing.state.trim(),
      zip: billing.zip.trim(),
      country: billing.country?.trim() || 'United States',
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
    const { checkoutUrl, invoiceId } = await createDepositIntent(roundedAmount, billingInfo)

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
