import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, expireStaleDeposits, getSiteSettings, addToWallet } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { createCheckout } from '@/lib/pandabase'
import { flagAndBlacklist } from '@/lib/blacklist'
import { logError } from '@/lib/error-log'
import { localToUsd, usdToLocal, isSupportedCurrency } from '@/lib/fx'
import { captureServerEvent } from '@/lib/posthog-api'

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
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1'
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

    // Repeat-victim rebate: 3+ failed orders in 7d → 2% credit capped at $5
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const failedOrders = await prisma.order.count({
        where: {
          userId: user.id,
          status: 'failed',
          createdAt: { gte: sevenDaysAgo },
        },
      })
      if (failedOrders >= 3) {
        // Check no prior rebate in last 7d
        const priorRebate = await prisma.transactionLedger.findFirst({
          where: {
            userId: user.id,
            type: 'admin_adjust',
            description: { contains: 'rebate' },
            createdAt: { gte: sevenDaysAgo },
          },
        })
        if (!priorRebate) {
          const rebateAmount = Math.min(roundedAmount * 0.02, 5)
          const rebateRounded = Math.round(rebateAmount * 100) / 100
          if (rebateRounded > 0) {
            await addToWallet(user.id, rebateRounded, {
              type: 'admin_adjust',
              description: 'rebate: 3+ outage failures in 7d',
            })
            await captureServerEvent(user.id, 'rebate_credit_granted', {
              user_id: user.id,
              rebate_amount: rebateRounded,
              qualifying_failures_7d: failedOrders,
            })
            console.log(`[rebate] user=${user.id} rebate=$${rebateRounded} failures=${failedOrders}`)
          }
        }
      }
    } catch (err) {
      console.error('[rebate] failed:', err)
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

    // Compute attempt_number / is_retry from recent deposit history (last 30min).
    const allDeposits = await getUserDeposits(user.id)
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000
    const recentFails = allDeposits.filter(d =>
      (d.status === 'failed' || d.status === 'expired') &&
      new Date(d.createdAt).getTime() > thirtyMinAgo &&
      d.id !== deposit.id
    )
    const isRetry = recentFails.length > 0
    const attemptNumber = allDeposits.filter(d => new Date(d.createdAt).getTime() > thirtyMinAgo).length

    // Server-side deposit_initiated — fires even if client-side capture is blocked
    // (ad-blocker, navigation, etc). NOTE: method=pending here because the user
    // hasn't picked Apple Pay / Google Pay / Card on the Pandabase sheet yet —
    // the actual `final_method` only lands on deposit_completed/failed via webhook.
    try {
      await captureServerEvent(user.id, 'deposit_initiated', {
        provider: 'pandabase',
        method: 'pending', // resolved on completion/failure
        currency: inputCurrency,
        amount_usd: roundedAmount,
        local_amount: amount,
        local_currency: inputCurrency,
        fx_rate: fx.rate,
        processing_fee: processingFee,
        charge_amount: chargeAmount,
        intent_id: deposit.id,
        deposit_id: deposit.id,
        invoice_id: sessionId,
        ref_id: refId,
        attempt_number: attemptNumber,
        is_retry: isRetry,
        source: 'server',
      })
    } catch (err) {
      console.error('[posthog] deposit_initiated capture failed:', err)
    }

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
