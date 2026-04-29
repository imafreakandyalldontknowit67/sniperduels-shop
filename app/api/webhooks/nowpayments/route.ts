import { NextRequest, NextResponse } from 'next/server'
import { verifyIpnSignature } from '@/lib/nowpayments'
import { getDeposit, claimPendingDeposit, claimExpiredDeposit, addToWallet, getUser, createLedgerEntry } from '@/lib/storage'
import { notifyDeposit } from '@/lib/discord-webhook'
import { processReferralCommission } from '@/lib/referral'
import { logError } from '@/lib/error-log'

export const dynamic = 'force-dynamic'

async function creditDeposit(deposit: { id: string; userId: string; amount: number }, source: string) {
  const credited = await addToWallet(deposit.userId, deposit.amount)
  if (!credited) {
    console.error(`[NOWPayments IPN] CRITICAL: addToWallet returned null for deposit ${deposit.id} ($${deposit.amount}) — wallet may be at max`)
    await logError({ where: 'deposit.credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, amount: deposit.amount } })
    return
  }
  createLedgerEntry({
    type: 'deposit',
    userId: deposit.userId,
    amount: deposit.amount,
    description: `Crypto deposit: $${deposit.amount}`,
    relatedId: deposit.id,
  }).catch(err => console.error('Ledger write failed (crypto deposit):', err))

  const user = await getUser(deposit.userId)
  await notifyDeposit(user?.name || deposit.userId, deposit.amount)
  console.log(`[NOWPayments IPN] ${source}: ${deposit.id} ($${deposit.amount})`)
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

    // Terminal success statuses
    if (status === 'finished' || status === 'confirmed') {
      const claimed = await tryClaimDeposit(deposit)
      if (!claimed) {
        console.log(`[NOWPayments IPN] Already claimed: ${deposit.id}`)
        return NextResponse.json({ received: true })
      }
      await creditDeposit(deposit, 'Completed')

    } else if (status === 'partially_paid') {
      // Network fees can cause tiny shortfalls (e.g. $0.12 on a $27 deposit).
      // If the user paid ≥98% of the expected crypto amount, credit them fully.
      const actuallyPaid = Number(payload.actually_paid || 0)
      const expectedPay = Number(payload.pay_amount || 0)

      if (expectedPay > 0 && actuallyPaid >= expectedPay * 0.98) {
        console.log(`[NOWPayments IPN] Partially paid but within 98% threshold (${actuallyPaid}/${expectedPay}): ${deposit.id}`)
        const claimed = await tryClaimDeposit(deposit)
        if (claimed) {
          await creditDeposit(deposit, 'Completed (partial ≥98%)')
        }
      } else {
        console.log(`[NOWPayments IPN] Partially paid below threshold (${actuallyPaid}/${expectedPay}): ${deposit.id} — waiting`)
      }

    } else if (status === 'failed' || status === 'expired' || status === 'refunded') {
      const { prisma } = await import('@/lib/prisma')
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: 'pending' },
        data: { status: 'failed', updatedAt: new Date().toISOString() },
      })
      console.log(`[NOWPayments IPN] ${status}: ${deposit.id}`)

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
