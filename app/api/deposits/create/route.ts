import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, expireStaleDeposits, getSiteSettings } from '@/lib/storage'
import { createCheckout } from '@/lib/pandabase'
import { flagAndBlacklist } from '@/lib/blacklist'
import { logError } from '@/lib/error-log'
import { localToUsd, usdToLocal, isSupportedCurrency } from '@/lib/fx'

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
    const { amount, localCurrency, website } = body

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

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    // Server-authoritative FX conversion. Treat the inbound `amount` as the
    // user's local currency. Default to USD when unset (older client builds).
    const inputCurrency = (typeof localCurrency === 'string' && localCurrency.toUpperCase()) || 'USD'
    if (!isSupportedCurrency(inputCurrency)) {
      return NextResponse.json({ error: `Unsupported currency: ${inputCurrency}` }, { status: 400 })
    }
    const fx = await localToUsd(amount, inputCurrency)
    const roundedAmount = fx.usdAmount

    if (roundedAmount < 5) {
      const minLocal = await usdToLocal(5, inputCurrency)
      return NextResponse.json(
        { error: `Minimum is $5 USD${inputCurrency !== 'USD' ? ` (~${minLocal.toFixed(2)} ${inputCurrency})` : ''}` },
        { status: 400 }
      )
    }

    // 7% + $0.35 processing fee on card/fiat deposits to cover Pandabase fees
    const PROCESSING_FEE_RATE = 0.07
    const PROCESSING_FEE_FIXED = 0.35
    const processingFee = Math.round((roundedAmount * PROCESSING_FEE_RATE + PROCESSING_FEE_FIXED) * 100) / 100
    const chargeAmount = Math.round((roundedAmount + processingFee) * 100) / 100

    await expireStaleDeposits()

    const pendingDeposits = (await getUserDeposits(user.id)).filter(d => d.status === 'pending')
    if (pendingDeposits.length >= 3) {
      return NextResponse.json(
        { error: 'You already have 3 pending deposits. Please complete or wait for them to expire.' },
        { status: 429 }
      )
    }

    // Charge the customer the deposit amount + processing fee.
    // Pass roundedAmount as walletCredit so the Pandabase line-item name shows
    // what the customer actually receives in their wallet, not the marked-up subtotal.
    const { sessionId, checkoutUrl, refId } = await createCheckout(chargeAmount, roundedAmount)

    // Store the original deposit amount (what gets credited to wallet)
    const deposit = await createDeposit({
      userId: user.id,
      amount: roundedAmount,
      processingFee,
      chargeAmount,
      status: 'pending',
      pandabaseInvoiceId: sessionId,
      pandabaseRefId: refId,
      pandabaseCheckoutUrl: checkoutUrl,
      localAmount: amount,
      localCurrency: inputCurrency,
      fxRate: fx.rate,
    })

    if (fx.source === 'fallback') {
      console.error(`[deposit.create] FX_FALLBACK_USED user=${user.id} currency=${inputCurrency} rate=${fx.rate} reason=rates_api_down dep=${deposit.id}`)
    }
    console.log(`[deposit.card] user=${user.id} local=${amount} ${inputCurrency} rate=${fx.rate} usd=$${roundedAmount} fx=${fx.source} dep=${deposit.id}`)

    return NextResponse.json({
      depositId: deposit.id,
      sessionId,
      checkoutUrl,
      processingFee,
      chargeAmount,
    })
  } catch (error) {
    console.error('[deposits/create] exception:', error instanceof Error ? error.message : String(error))
    await logError({ where: 'deposits.create.exception', error })
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}
