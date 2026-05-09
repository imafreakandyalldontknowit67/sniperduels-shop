import { NextRequest, NextResponse } from 'next/server'
import { verifyIpnSignature } from '@/lib/nearpayments'
import { getDeposit, claimPendingDeposit, addToWallet, createLedgerEntry } from '@/lib/storage'
import { logError } from '@/lib/error-log'
import { captureServerEvent, extractCryptoPaymentInfo } from '@/lib/posthog-api'

export const dynamic = 'force-dynamic'

const CRYPTO_BONUS = 0 // No bonus — 1:1 crypto deposits

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-nowpayments-sig') || ''
    const payload = JSON.parse(rawBody)

    console.log(`[NearPayments IPN] Status: ${payload.payment_status}, Order: ${payload.order_id}`)
    console.log(`[NearPayments IPN] Payload: ${rawBody.slice(0, 1000)}`)

    // Verify signature (always required — reject if missing or invalid)
    if (!signature || !verifyIpnSignature(payload, signature)) {
      console.error('[NearPayments IPN] Missing or invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const status = payload.payment_status
    const depositId = payload.order_id

    if (!depositId) {
      console.warn('[NearPayments IPN] No order_id in payload')
      return NextResponse.json({ received: true })
    }

    const deposit = await getDeposit(depositId)
    if (!deposit) {
      console.warn(`[NearPayments IPN] Deposit not found: ${depositId}`)
      return NextResponse.json({ received: true })
    }

    const cryptoInfo = extractCryptoPaymentInfo(payload)
    const processing_time_ms = deposit.createdAt ? (Date.now() - new Date(deposit.createdAt).getTime()) : undefined

    if (status === 'finished' || status === 'confirmed') {
      const claimed = await claimPendingDeposit(deposit.id)
      if (!claimed) {
        console.log(`[NearPayments IPN] Already claimed: ${deposit.id}`)
        return NextResponse.json({ received: true })
      }

      // Credit wallet 1:1
      const credited = await addToWallet(deposit.userId, deposit.amount, {
        type: 'deposit',
        description: `Crypto deposit: $${deposit.amount}`,
        relatedId: deposit.id,
      })
      if (!credited) {
        console.error(`[nearpayments] WALLET_CREDIT_FAILED user=${deposit.userId} amount=${deposit.amount} dep=${deposit.id}`)
        await logError({ where: 'deposit.crypto_credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, amount: deposit.amount } })
        // Return 5xx so NowPayments retries the IPN.
        return NextResponse.json({ error: 'wallet credit failed' }, { status: 500 })
      }

      console.log(`[nearpayments] wallet credit ok user=${deposit.userId} amount=${deposit.amount} dep=${deposit.id}`)
      console.log(`[NearPayments IPN] Completed: ${deposit.id} ($${deposit.amount})`)

      try {
        const baseProps = {
          provider: 'nearpayments',
          currency: cryptoInfo.pay_currency,
          pay_currency: cryptoInfo.pay_currency,
          final_method: cryptoInfo.final_method,
          method: 'crypto',
          payment_status: cryptoInfo.payment_status,
          amount_received: cryptoInfo.actually_paid,
          actually_paid: cryptoInfo.actually_paid,
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
      // Auto-credit partial payments proportionally so funds never get stranded
      // in "partially paid" purgatory — works for every NowPayments-accepted
      // currency because the math is on the ratio, not the crypto.
      // ratio >= 0.98: credit full intended (network-fee dust tolerance).
      // ratio <  0.98: credit price_amount * ratio.
      // creditUsd < $0.50: skip as dust.
      const actuallyPaid = Number(payload.actually_paid || 0)
      const expectedPay = Number(payload.pay_amount || 0)
      const priceAmount = Number(payload.price_amount || deposit.amount)
      const payCurrency = String(payload.pay_currency || '?')

      try {
        await captureServerEvent(deposit.userId, 'crypto_payment_underpaid', {
          provider: 'nearpayments',
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
          amount_usd: deposit.amount,
        })
      } catch (err) {
        console.error('[posthog] crypto_payment_underpaid capture failed:', err)
      }

      if (expectedPay <= 0 || actuallyPaid <= 0) {
        console.log(`[nearpayments] partial with zero amounts (paid=${actuallyPaid} expected=${expectedPay}): ${deposit.id} — skipping`)
      } else {
        const ratio = actuallyPaid / expectedPay
        const ratioPct = (ratio * 100).toFixed(2)
        const creditUsd = ratio >= 0.98 ? priceAmount : Math.round(priceAmount * ratio * 100) / 100

        if (creditUsd < 0.50) {
          console.log(`[nearpayments] partial below dust threshold ($${creditUsd}, ratio=${ratioPct}%, crypto=${payCurrency}): ${deposit.id} — not crediting`)
        } else {
          const claimed = await claimPendingDeposit(deposit.id)
          if (!claimed) {
            console.log(`[nearpayments] partial already claimed: ${deposit.id}`)
            return NextResponse.json({ received: true })
          }

          const desc = ratio >= 0.98
            ? `Crypto deposit (partial ${ratioPct}% — within fee tolerance): $${creditUsd}`
            : `Crypto deposit (partial ${ratioPct}%): $${creditUsd} of $${priceAmount} (paid ${actuallyPaid} ${payCurrency} of ${expectedPay} expected)`
          const credited = await addToWallet(deposit.userId, creditUsd, {
            type: 'deposit',
            description: desc,
            relatedId: deposit.id,
          })
          if (!credited) {
            console.error(`[nearpayments] PARTIAL_WALLET_CREDIT_FAILED user=${deposit.userId} amount=${creditUsd} dep=${deposit.id}`)
            await logError({ where: 'deposit.crypto_partial_credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, creditUsd, priceAmount, ratio } })
            return NextResponse.json({ error: 'wallet credit failed' }, { status: 500 })
          }

          // Sync the deposit row's `amount` field so the dashboard shows what
          // was actually credited, not the original intended amount.
          if (creditUsd !== deposit.amount) {
            const { prisma } = await import('@/lib/prisma')
            await prisma.deposit.update({
              where: { id: deposit.id },
              data: { amount: creditUsd, updatedAt: new Date().toISOString() },
            }).catch(err => console.error('[nearpayments] Failed to sync deposit amount:', err))
          }

          console.log(`[nearpayments] partial credit ok user=${deposit.userId} expected=$${priceAmount} paid=$${creditUsd} ratio=${ratioPct}% crypto=${payCurrency} dep=${deposit.id}`)
        }
      }
    } else if (status === 'failed' || status === 'expired' || status === 'refunded') {
      const { prisma } = await import('@/lib/prisma')
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: 'pending' },
        data: { status: 'failed', updatedAt: new Date().toISOString() },
      })
      console.log(`[NearPayments IPN] Failed/expired: ${deposit.id}`)

      try {
        const granular = status === 'expired' ? 'crypto_payment_expired' : 'crypto_payment_failed'
        const baseProps = {
          provider: 'nearpayments',
          currency: cryptoInfo.pay_currency,
          pay_currency: cryptoInfo.pay_currency,
          final_method: cryptoInfo.final_method,
          method: 'crypto',
          payment_method_type: 'crypto',
          payment_status: status,
          decline_code: status,
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
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[nearpayments] UNHANDLED_EXCEPTION', error instanceof Error ? error.message : String(error))
    await logError({ where: 'webhook.nearpayments.exception', error })
    // Return 5xx so NowPayments retries the IPN.
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
