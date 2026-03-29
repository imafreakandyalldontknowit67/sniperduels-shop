import { NextRequest, NextResponse } from 'next/server'
import { verifyIpnSignature } from '@/lib/nearpayments'
import { getDeposit, claimPendingDeposit, addToWallet, getUser, createLedgerEntry } from '@/lib/storage'
import { notifyDeposit } from '@/lib/discord-webhook'

export const dynamic = 'force-dynamic'

const CRYPTO_BONUS = 0.03 // 3% bonus for crypto deposits

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

      // Credit wallet + 5% bonus
      const bonus = Math.round(deposit.amount * CRYPTO_BONUS * 100) / 100
      const totalCredit = deposit.amount + bonus
      await addToWallet(deposit.userId, totalCredit)
      createLedgerEntry({
        type: 'deposit',
        userId: deposit.userId,
        amount: totalCredit,
        description: `Crypto deposit: $${deposit.amount} + $${bonus} bonus`,
        relatedId: deposit.id,
      }).catch(err => console.error('Ledger write failed (crypto deposit):', err))

      const user = await getUser(deposit.userId)
      await notifyDeposit(user?.name || deposit.userId, totalCredit)
      console.log(`[NearPayments IPN] Completed: ${deposit.id} ($${deposit.amount} + $${bonus} bonus = $${totalCredit})`)
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
    console.error('[NearPayments IPN] Error:', error)
    return NextResponse.json({ received: true })
  }
}
