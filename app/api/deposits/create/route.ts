import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, expireStaleDeposits, getSiteSettings } from '@/lib/storage'
import { createDepositIntent } from '@/lib/pandabase'
import { flagAndBlacklist } from '@/lib/blacklist'

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
    const { amount, website } = body

    // Honeypot: hidden field that real users never fill
    if (website) {
      const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
      await flagAndBlacklist({
        ip,
        userId: user.id,
        reason: 'Filled honeypot field on deposit form',
        endpoint: '/api/deposits/create',
        userAgent: request.headers.get('user-agent') || undefined,
      })
      // Return fake success so they don't know they're caught
      return NextResponse.json({ depositId: `dep_${Date.now()}`, checkoutUrl: '/dashboard/deposit' })
    }

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
    const { checkoutUrl, invoiceId, refId, sessionId } = await createDepositIntent(roundedAmount)

    // Store deposit record
    const deposit = await createDeposit({
      userId: user.id,
      amount: roundedAmount,
      status: 'pending',
      pandabaseInvoiceId: invoiceId,
      pandabaseRefId: refId,
      pandabaseCheckoutUrl: checkoutUrl,
    })

    return NextResponse.json({
      depositId: deposit.id,
      checkoutUrl,
      sessionId,
    })
  } catch (error) {
    console.error('Deposit creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create deposit' },
      { status: 500 }
    )
  }
}
