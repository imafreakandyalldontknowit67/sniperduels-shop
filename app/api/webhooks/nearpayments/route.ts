import { NextRequest, NextResponse } from 'next/server'
import { verifyIpnSignature } from '@/lib/nearpayments'
import { getDeposit, claimPendingDeposit, addToWallet, createLedgerEntry } from '@/lib/storage'
import { logError } from '@/lib/error-log'

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

    if (status === 'finished' || status === 'confirmed') {
      const claimed = await claimPendingDeposit(deposit.id)
      if (!claimed) {
        console.log(`[NearPayments IPN] Already claimed: ${deposit.id}`)
        return NextResponse.json({ received: true })
      }

      // Credit wallet 1:1
      const credited = await addToWallet(deposit.userId, deposit.amount)
      if (!credited) {
        console.error(`[nearpayments] WALLET_CREDIT_FAILED user=${deposit.userId} amount=${deposit.amount} dep=${deposit.id}`)
        await logError({ where: 'deposit.crypto_credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, amount: deposit.amount } })
        // Return 5xx so NowPayments retries the IPN.
        return NextResponse.json({ error: 'wallet credit failed' }, { status: 500 })
      }
      createLedgerEntry({
        type: 'deposit',
        userId: deposit.userId,
        amount: deposit.amount,
        description: `Crypto deposit: $${deposit.amount}`,
        relatedId: deposit.id,
      }).catch(err => console.error('Ledger write failed (crypto deposit):', err))

      console.log(`[nearpayments] wallet credit ok user=${deposit.userId} amount=${deposit.amount} dep=${deposit.id}`)
      console.log(`[NearPayments IPN] Completed: ${deposit.id} ($${deposit.amount})`)
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

          const credited = await addToWallet(deposit.userId, creditUsd)
          if (!credited) {
            console.error(`[nearpayments] PARTIAL_WALLET_CREDIT_FAILED user=${deposit.userId} amount=${creditUsd} dep=${deposit.id}`)
            await logError({ where: 'deposit.crypto_partial_credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, creditUsd, priceAmount, ratio } })
            return NextResponse.json({ error: 'wallet credit failed' }, { status: 500 })
          }

          const desc = ratio >= 0.98
            ? `Crypto deposit (partial ${ratioPct}% — within fee tolerance): $${creditUsd}`
            : `Crypto deposit (partial ${ratioPct}%): $${creditUsd} of $${priceAmount} (paid ${actuallyPaid} ${payCurrency} of ${expectedPay} expected)`
          createLedgerEntry({
            type: 'deposit',
            userId: deposit.userId,
            amount: creditUsd,
            description: desc,
            relatedId: deposit.id,
          }).catch(err => console.error('Ledger write failed (crypto partial deposit):', err))

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
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[nearpayments] UNHANDLED_EXCEPTION', error instanceof Error ? error.message : String(error))
    await logError({ where: 'webhook.nearpayments.exception', error })
    // Return 5xx so NowPayments retries the IPN.
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
