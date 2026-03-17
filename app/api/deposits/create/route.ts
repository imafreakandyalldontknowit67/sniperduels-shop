import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, expireStaleDeposits, getSiteSettings } from '@/lib/storage'
import { createCheckout } from '@/lib/pandabase'
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

    // Honeypot check
    if (website) {
      const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
      await flagAndBlacklist({
        ip, userId: user.id,
        reason: 'Filled honeypot field on deposit form',
        endpoint: '/api/deposits/create',
        userAgent: request.headers.get('user-agent') || undefined,
      })
      return NextResponse.json({ depositId: `dep_${Date.now()}`, checkoutUrl: '/dashboard/deposit', sessionId: '' })
    }

    if (!amount || typeof amount !== 'number' || amount < 5 || amount > 500) {
      return NextResponse.json({ error: 'Amount must be between $5 and $500' }, { status: 400 })
    }

    const roundedAmount = Math.round(amount * 100) / 100

    await expireStaleDeposits()

    const pendingDeposits = (await getUserDeposits(user.id)).filter(d => d.status === 'pending')
    if (pendingDeposits.length >= 3) {
      return NextResponse.json(
        { error: 'You already have 3 pending deposits. Please complete or wait for them to expire.' },
        { status: 429 }
      )
    }

    const { sessionId, checkoutUrl, refId } = await createCheckout(roundedAmount)

    // Store sessionId as pandabaseInvoiceId — webhook sends it back as orderNumber
    const deposit = await createDeposit({
      userId: user.id,
      amount: roundedAmount,
      status: 'pending',
      pandabaseInvoiceId: sessionId,
      pandabaseRefId: refId,
      pandabaseCheckoutUrl: checkoutUrl,
    })

    return NextResponse.json({
      depositId: deposit.id,
      sessionId,
      checkoutUrl,
    })
  } catch (error) {
    console.error('Deposit creation error:', error)
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}
