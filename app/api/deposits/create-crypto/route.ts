import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, updateDeposit, expireStaleDeposits, getSiteSettings } from '@/lib/storage'
import { createCryptoPayment } from '@/lib/nowpayments'
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

    if (!amount || typeof amount !== 'number' || amount < 5) {
      return NextResponse.json({ error: 'Amount must be at least $5' }, { status: 400 })
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

    // Create NOWPayments payment
    let paymentResult
    try {
      paymentResult = await createCryptoPayment(roundedAmount, deposit.id, currency)
    } catch (err) {
      const errMsg = String(err)
      if (errMsg.includes('too low')) {
        return NextResponse.json(
          { error: `Amount is too low for ${currency.toUpperCase()}. Try a higher amount or use a different currency like SOL or USDT.` },
          { status: 400 }
        )
      }
      console.error('Crypto payment provider error:', err)
      return NextResponse.json(
        { error: "Crypto deposits aren't available at this moment. Feel free to open a ticket in our Discord for a manual deposit: https://discord.gg/sniperduels" },
        { status: 503 }
      )
    }

    // Store payment provider ID for status polling and recovery
    await updateDeposit(deposit.id, { paymentProviderId: paymentResult.paymentId })

    return NextResponse.json({
      depositId: deposit.id,
      paymentId: paymentResult.paymentId,
      payAddress: paymentResult.payAddress,
      payAmount: paymentResult.payAmount,
      payCurrency: paymentResult.payCurrency,
      bonusAmount: 0,
    })
  } catch (error) {
    console.error('Crypto deposit error:', error)
    return NextResponse.json({ error: 'Failed to create crypto deposit' }, { status: 500 })
  }
}
