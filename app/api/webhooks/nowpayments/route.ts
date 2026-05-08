import { NextRequest, NextResponse } from 'next/server'
import { verifyIpnSignature } from '@/lib/nowpayments'
import { getDeposit, claimPendingDeposit, claimExpiredDeposit, addToWallet, createLedgerEntry } from '@/lib/storage'
import { logError } from '@/lib/error-log'
import { captureServerEvent, extractCryptoPaymentInfo } from '@/lib/posthog-api'

export const dynamic = 'force-dynamic'

async function creditDeposit(
  deposit: { id: string; userId: string; amount: number },
  source: string,
  override?: { creditUsd: number; description: string },
) {
  const amount = override ? override.creditUsd : deposit.amount
  const credited = await addToWallet(deposit.userId, amount)
  if (!credited) {
    console.error(`[NOWPayments IPN] CRITICAL: addToWallet returned null for deposit ${deposit.id} ($${amount}) — wallet may be at max`)
    await logError({ where: 'deposit.credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, amount } })
    return
  }
  createLedgerEntry({
    type: 'deposit',
    userId: deposit.userId,
    amount,
    description: override ? override.description : `Crypto deposit: $${amount}`,
    relatedId: deposit.id,
  }).catch(err => console.error('Ledger write failed (crypto deposit):', err))

  // Sync the deposit row's `amount` field to what was actually credited so the
  // dashboard doesn't show $47.52 when only $35.22 hit the wallet.
  if (override && override.creditUsd !== deposit.amount) {
    const { prisma } = await import('@/lib/prisma')
    await prisma.deposit.update({
      where: { id: deposit.id },
      data: { amount: override.creditUsd, updatedAt: new Date().toISOString() },
    }).catch(err => console.error('[NOWPayments IPN] Failed to sync deposit amount:', err))
  }

  console.log(`[NOWPayments IPN] ${source}: ${deposit.id} ($${amount})`)
}

async function tryClaimDeposit(deposit: { id: string; status: string }): Promise<boolean> {
  // Try pending first, then expired (for late webhook recovery)
  let claimed = await claimPendingDeposit(deposit.id)
  if (!claimed && deposit.status === 'expired') {
    claimed = await claimExpiredDeposit(deposit.id)
    if (claimed) console.log(`[NOWPayments IPN] Recovered expired deposit: ${deposit.id}`)
  }
  return claimed
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-nowpayments-sig') || ''
    const payload = JSON.parse(rawBody)

    const status = payload.payment_status
    const depositId = payload.order_id

    console.log(`[NOWPayments IPN] Status: ${status}, Order: ${depositId}, PaymentID: ${payload.payment_id}`)

    // Verify signature — always required
    if (!signature || !verifyIpnSignature(payload, signature)) {
      console.error('[NOWPayments IPN] Missing or invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    if (!depositId) {
      console.warn('[NOWPayments IPN] No order_id in payload')
      return NextResponse.json({ received: true })
    }

    const deposit = await getDeposit(depositId)
    if (!deposit) {
      console.warn(`[NOWPayments IPN] Deposit not found: ${depositId}`)
      return NextResponse.json({ received: true })
    }

    // Already completed — skip (prevents double-credit)
    if (deposit.status === 'completed') {
      console.log(`[NOWPayments IPN] Deposit ${depositId} already completed, skipping`)
      return NextResponse.json({ received: true })
    }

    // Pull instrumentation-safe fields once for use across branches.
    const cryptoInfo = extractCryptoPaymentInfo(payload)
    const processing_time_ms = deposit.createdAt ? (Date.now() - new Date(deposit.createdAt).getTime()) : undefined

    // Terminal success statuses
    if (status === 'finished' || status === 'confirmed') {
      const claimed = await tryClaimDeposit(deposit)
      if (!claimed) {
        console.log(`[NOWPayments IPN] Already claimed: ${deposit.id}`)
        return NextResponse.json({ received: true })
      }
      await creditDeposit(deposit, 'Completed')

      // crypto_payment_received is the granular crypto-only event; deposit_completed
      // is the unified provider-agnostic event. We fire both so funnels can pivot
      // either way.
      try {
        const baseProps = {
          provider: 'nowpayments',
          currency: cryptoInfo.pay_currency,
          pay_currency: cryptoInfo.pay_currency,
          final_method: cryptoInfo.final_method,
          method: 'crypto',
          payment_status: cryptoInfo.payment_status,
          amount_received: cryptoInfo.actually_paid,
          actually_paid: cryptoInfo.actually_paid,
          outcome_amount: cryptoInfo.outcome_amount,
          outcome_currency: cryptoInfo.outcome_currency,
          payment_id: cryptoInfo.payment_id,
          intent_id: deposit.id,
          deposit_id: deposit.id,
          tx_hash: cryptoInfo.tx_hash,
          amount_usd: deposit.amount,
          processing_time_ms,
        }
        await captureServerEvent(deposit.userId, 'crypto_payment_received', baseProps)
        await captureServerEvent(deposit.userId, 'deposit_completed', baseProps)
      } catch (err) {
        console.error('[posthog] crypto deposit_completed capture failed:', err)
      }

    } else if (status === 'partially_paid') {
      // Auto-credit ANY partial payment proportionally so funds never get
      // stranded. Works for every NowPayments-accepted currency (BTC/ETH/SOL/
      // USDC/USDT/etc) because the math is on the ratio, not the crypto.
      //
      // Special case ≥98%: credit the FULL intended amount (covers network-fee
      // dust where user paid ~99% — they shouldn't lose 1% to gas).
      // Below 98%: credit proportional USD = price_amount * (actually_paid / pay_amount).
      // Below dust threshold ($0.50): skip — not worth the wallet noise.
      const actuallyPaid = Number(payload.actually_paid || 0)
      const expectedPay = Number(payload.pay_amount || 0)
      const priceAmount = Number(payload.price_amount || deposit.amount)
      const payCurrency = String(payload.pay_currency || '?')

      // Fire crypto_payment_underpaid for ALL partial events — gives us
      // visibility on the underpay distribution even when we end up crediting.
      try {
        await captureServerEvent(deposit.userId, 'crypto_payment_underpaid', {
          provider: 'nowpayments',
          currency: cryptoInfo.pay_currency,
          pay_currency: cryptoInfo.pay_currency,
          final_method: cryptoInfo.final_method,
          method: 'crypto',
          payment_status: 'partially_paid',
          actually_paid: cryptoInfo.actually_paid,
          pay_amount_expected: cryptoInfo.pay_amount,
          ratio: cryptoInfo.ratio,
          payment_id: cryptoInfo.payment_id,
          intent_id: deposit.id,
          deposit_id: deposit.id,
          tx_hash: cryptoInfo.tx_hash,
          price_amount: cryptoInfo.price_amount,
          amount_usd: deposit.amount,
        })
      } catch (err) {
        console.error('[posthog] crypto_payment_underpaid capture failed:', err)
      }

      if (expectedPay <= 0 || actuallyPaid <= 0) {
        console.log(`[NOWPayments IPN] Partial with zero amounts (paid=${actuallyPaid} expected=${expectedPay}): ${deposit.id} — skipping`)
      } else {
        const ratio = actuallyPaid / expectedPay
        const ratioPct = (ratio * 100).toFixed(2)

        if (ratio >= 0.98) {
          // Network-fee dust — credit the full intended amount.
          console.log(`[nowpayments] partial near-full credit ok user=${deposit.userId} expected=$${priceAmount} paid=$${priceAmount} ratio=${ratioPct}% crypto=${payCurrency} dep=${deposit.id}`)
          const claimed = await tryClaimDeposit(deposit)
          if (claimed) {
            await creditDeposit(deposit, `Completed (partial ${ratioPct}% — within fee tolerance)`)
          }
        } else {
          // Proportional credit. Round to 2 decimals.
          const creditUsd = Math.round(priceAmount * ratio * 100) / 100

          if (creditUsd < 0.50) {
            console.log(`[nowpayments] partial below dust threshold ($${creditUsd}, ratio=${ratioPct}%, crypto=${payCurrency}): ${deposit.id} — not crediting`)
          } else {
            console.log(`[nowpayments] partial credit ok user=${deposit.userId} expected=$${priceAmount} paid=$${creditUsd} ratio=${ratioPct}% crypto=${payCurrency} dep=${deposit.id}`)
            const claimed = await tryClaimDeposit(deposit)
            if (claimed) {
              await creditDeposit(deposit, `Completed (partial ${ratioPct}%)`, {
                creditUsd,
                description: `Crypto deposit (partial ${ratioPct}%): $${creditUsd} of $${priceAmount} (paid ${actuallyPaid} ${payCurrency} of ${expectedPay} expected)`,
              })
            }
          }
        }
      }

    } else if (status === 'failed' || status === 'expired' || status === 'refunded') {
      const { prisma } = await import('@/lib/prisma')
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: 'pending' },
        data: { status: 'failed', updatedAt: new Date().toISOString() },
      })
      console.log(`[NOWPayments IPN] ${status}: ${deposit.id}`)

      // Capture both the granular crypto event (so we can chart expired vs failed)
      // and the unified deposit_failed event for the cross-provider funnel.
      try {
        const granular = status === 'expired' ? 'crypto_payment_expired' : 'crypto_payment_failed'
        const baseProps = {
          provider: 'nowpayments',
          currency: cryptoInfo.pay_currency,
          pay_currency: cryptoInfo.pay_currency,
          final_method: cryptoInfo.final_method,
          method: 'crypto',
          payment_method_type: 'crypto',
          payment_status: status,
          decline_code: status, // expired / failed / refunded
          actually_paid: cryptoInfo.actually_paid,
          pay_amount_expected: cryptoInfo.pay_amount,
          payment_id: cryptoInfo.payment_id,
          intent_id: deposit.id,
          deposit_id: deposit.id,
          amount_usd: deposit.amount,
          source: 'webhook',
        }
        await captureServerEvent(deposit.userId, granular, baseProps)
        await captureServerEvent(deposit.userId, 'deposit_failed', baseProps)
      } catch (err) {
        console.error('[posthog] crypto deposit_failed capture failed:', err)
      }

    } else if (status === 'sending' || status === 'confirming' || status === 'waiting') {
      console.log(`[NOWPayments IPN] In progress (${status}): ${deposit.id}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[NOWPayments IPN] Error:', error)
    await logError({ where: 'webhook.nowpayments.exception', error })
    return NextResponse.json({ received: true })
  }
}
