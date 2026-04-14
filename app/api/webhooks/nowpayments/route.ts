import { NextRequest, NextResponse } from 'next/server'
import { verifyIpnSignature } from '@/lib/nowpayments'
import { getDeposit, claimPendingDeposit, addToWallet, getUser, createLedgerEntry } from '@/lib/storage'
import { notifyDeposit } from '@/lib/discord-webhook'
import { processReferralCommission } from '@/lib/referral'

export const dynamic = 'force-dynamic'

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

    // Already processed — skip
    if (deposit.status !== 'pending') {
      console.log(`[NOWPayments IPN] Deposit ${depositId} already ${deposit.status}, skipping`)
      return NextResponse.json({ received: true })
    }

    // Terminal success statuses
    if (status === 'finished' || status === 'confirmed') {
      const claimed = await claimPendingDeposit(deposit.id)
      if (!claimed) {
        console.log(`[NOWPayments IPN] Already claimed: ${deposit.id}`)
        return NextResponse.json({ received: true })
      }

      // Credit wallet 1:1 (no processing fee on crypto)
      await addToWallet(deposit.userId, deposit.amount)
      createLedgerEntry({
        type: 'deposit',
        userId: deposit.userId,
        amount: deposit.amount,
        description: `Crypto deposit: $${deposit.amount}`,
        relatedId: deposit.id,
      }).catch(err => console.error('Ledger write failed (crypto deposit):', err))

      const user = await getUser(deposit.userId)
      await notifyDeposit(user?.name || deposit.userId, deposit.amount)
      console.log(`[NOWPayments IPN] Completed: ${deposit.id} ($${deposit.amount})`)

    } else if (status === 'failed' || status === 'expired' || status === 'refunded') {
      const { prisma } = await import('@/lib/prisma')
      await prisma.deposit.updateMany({
        where: { id: deposit.id, status: 'pending' },
        data: { status: 'failed', updatedAt: new Date().toISOString() },
      })
      console.log(`[NOWPayments IPN] ${status}: ${deposit.id}`)

    } else if (status === 'partially_paid') {
      console.log(`[NOWPayments IPN] Partially paid: ${deposit.id} — waiting for full payment`)
      // Don't credit — wait for 'finished' or 'confirmed'

    } else if (status === 'sending' || status === 'confirming' || status === 'waiting') {
      console.log(`[NOWPayments IPN] In progress (${status}): ${deposit.id}`)
      // Payment in progress — no action needed
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[NOWPayments IPN] Error:', error)
    return NextResponse.json({ received: true })
  }
}
