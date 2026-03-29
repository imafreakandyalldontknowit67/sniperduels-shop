import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, expireStaleDeposits, getSiteSettings } from '@/lib/storage'
import { createCryptoPayment } from '@/lib/nearpayments'
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { amount, currency, website } = body

    // Honeypot
    if (website) {
      const ip = request.headers.get('cf-connecting-ip') || request.ip || request.headers.get('x-real-ip') || '127.0.0.1'
      await flagAndBlacklist({
        ip, userId: user.id,
        reason: 'Filled honeypot on crypto deposit',
        endpoint: '/api/deposits/create-crypto',
        userAgent: request.headers.get('user-agent') || undefined,
      })
      return NextResponse.json({ depositId: `dep_${Date.now()}`, payAddress: '0x0000', payAmount: 0 })
    }

    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 500) {
      return NextResponse.json({ error: 'Amount must be between $5 and $500' }, { status: 400 })
    }

    if (!currency || typeof currency !== 'string' || currency.length > 20) {
      return NextResponse.json({ error: 'Invalid cryptocurrency' }, { status: 400 })
    }

    const roundedAmount = Math.round(amount * 100) / 100

    await expireStaleDeposits()

    const pendingDeposits = (await getUserDeposits(user.id)).filter(d => d.status === 'pending')
    if (pendingDeposits.length >= 3) {
      return NextResponse.json(
        { error: 'You already have 3 pending deposits. Complete or wait for them to expire.' },
        { status: 429 }
      )
    }

    // Create deposit record first so we have the ID for order_id
    // Crypto deposits have no processing fee (bonus instead)
    const deposit = await createDeposit({
      userId: user.id,
      amount: roundedAmount,
      processingFee: 0,
      chargeAmount: roundedAmount,
      status: 'pending',
      pandabaseInvoiceId: `crypto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      pandabaseCheckoutUrl: '',
      pandabaseRefId: currency,
    })

    // Create NearPayments payment
    const { paymentId, payAddress, payAmount, payCurrency } = await createCryptoPayment(
      roundedAmount,
      deposit.id,
      currency
    )

    return NextResponse.json({
      depositId: deposit.id,
      paymentId,
      payAddress,
      payAmount,
      payCurrency,
      bonusAmount: Math.round(roundedAmount * 0.03 * 100) / 100,
    })
  } catch (error) {
    console.error('Crypto deposit error:', error)
    return NextResponse.json({ error: 'Failed to create crypto deposit' }, { status: 500 })
  }
}
