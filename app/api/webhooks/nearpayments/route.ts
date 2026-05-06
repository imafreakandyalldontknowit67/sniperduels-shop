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
