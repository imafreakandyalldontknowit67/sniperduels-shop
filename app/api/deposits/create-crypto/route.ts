import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserDeposits, createDeposit, updateDeposit, expireStaleDeposits, getSiteSettings, addToWallet } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { createCryptoPayment } from '@/lib/nowpayments'
import { flagAndBlacklist } from '@/lib/blacklist'
import { localToUsd, usdToLocal, isSupportedCurrency } from '@/lib/fx'
import { captureServerEvent, cryptoFinalMethod } from '@/lib/posthog-api'

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
    const { amount, currency, localCurrency, website } = body

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

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    if (!currency || typeof currency !== 'string' || currency.length > 20) {
      return NextResponse.json({ error: 'Invalid cryptocurrency' }, { status: 400 })
    }

    // Server-authoritative FX conversion. Treat the inbound `amount` as
    // the user's local currency. Default to USD when the client doesn't
    // send `localCurrency` (older client builds + server-to-server callers).
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

    await expireStaleDeposits()

    const pendingDeposits = (await getUserDeposits(user.id)).filter(d => d.status === 'pending')
    if (pendingDeposits.length >= 3) {
      return NextResponse.json(
        { error: 'You already have 3 pending deposits. Complete or wait for them to expire.' },
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
      localAmount: amount,
      localCurrency: inputCurrency,
      fxRate: fx.rate,
    })

    if (fx.source === 'fallback') {
      console.error(`[deposit.create] FX_FALLBACK_USED user=${user.id} currency=${inputCurrency} rate=${fx.rate} reason=rates_api_down dep=${deposit.id}`)
    }
    console.log(`[deposit.crypto] user=${user.id} local=${amount} ${inputCurrency} rate=${fx.rate} usd=$${roundedAmount} fx=${fx.source} crypto=${currency} dep=${deposit.id}`)

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

    // Compute attempt_number / is_retry from the user's recent deposit history.
    // A "retry" = previous deposit by this user failed/expired in last 30 minutes.
    const allDeposits = await getUserDeposits(user.id)
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000
    const recentFails = allDeposits.filter(d =>
      (d.status === 'failed' || d.status === 'expired') &&
      new Date(d.createdAt).getTime() > thirtyMinAgo &&
      d.id !== deposit.id
    )
    const isRetry = recentFails.length > 0
    const attemptNumber = allDeposits.filter(d => new Date(d.createdAt).getTime() > thirtyMinAgo).length

    // Server-side crypto_address_generated — emitted from the server because
    // it has the canonical pay_address + payment_id from NowPayments.
    try {
      await captureServerEvent(user.id, 'crypto_address_generated', {
        provider: 'nowpayments',
        currency: paymentResult.payCurrency,
        pay_currency: paymentResult.payCurrency,
        final_method: cryptoFinalMethod(paymentResult.payCurrency),
        // address is intentionally hashed-not-logged-in-clear: include only last
        // 6 chars so you can correlate with on-chain refunds without leaking the
        // full address into PostHog. Full address stays in DB (deposit row).
        address_suffix: paymentResult.payAddress?.slice(-6),
        expected_amount: paymentResult.payAmount,
        amount_usd: roundedAmount,
        local_amount: amount,
        local_currency: inputCurrency,
        fx_rate: fx.rate,
        intent_id: deposit.id,
        deposit_id: deposit.id,
        payment_id: paymentResult.paymentId,
        attempt_number: attemptNumber,
        is_retry: isRetry,
      })

      // Also fire deposit_initiated server-side for crypto so the funnel always
      // has the row even if the client capture failed (ad-blocker, navigation, etc).
      await captureServerEvent(user.id, 'deposit_initiated', {
        provider: 'nowpayments',
        method: 'crypto',
        currency: inputCurrency,
        pay_currency: paymentResult.payCurrency,
        final_method: cryptoFinalMethod(paymentResult.payCurrency),
        amount_usd: roundedAmount,
        local_amount: amount,
        local_currency: inputCurrency,
        fx_rate: fx.rate,
        intent_id: deposit.id,
        deposit_id: deposit.id,
        payment_id: paymentResult.paymentId,
        attempt_number: attemptNumber,
        is_retry: isRetry,
        source: 'server',
      })
    } catch (err) {
      console.error('[posthog] crypto_address_generated capture failed:', err)
    }

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
