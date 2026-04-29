import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/pandabase'
import { getDepositByInvoiceId, getDepositByRefId, claimPendingDeposit, addToWallet, getUser, createLedgerEntry } from '@/lib/storage'
import type { Deposit } from '@/lib/storage'
import { notifyDeposit, notifyDispute, notifyRefund } from '@/lib/discord-webhook'
import { flagAndBlacklist } from '@/lib/blacklist'
import { logError } from '@/lib/error-log'

export const dynamic = 'force-dynamic'

async function findDeposit(payload: Record<string, unknown>): Promise<Deposit | undefined> {
  const data = (payload.data || {}) as Record<string, unknown>
  const order = (data.order || {}) as Record<string, unknown>
  const items = (order.items || []) as Array<Record<string, unknown>>

  // 1. Match by orderNumber (= our sessionId/cs_xxx stored as pandabaseInvoiceId)
  const orderNumber = (order.orderNumber || order.order_number || '') as string
  if (orderNumber) {
    const dep = await getDepositByInvoiceId(orderNumber)
    if (dep) { console.log(`[Webhook] Matched by orderNumber: ${orderNumber}`); return dep }
  }

  // 2. Match by refId from item name (#REFID suffix)
  for (const item of items) {
    const name = (item.name || '') as string
    const m = name.match(/#([A-Z0-9]+)$/)
    if (m) {
      const dep = await getDepositByRefId(m[1])
      if (dep) { console.log(`[Webhook] Matched by refId: ${m[1]}`); return dep }
    }
  }

  // 3. Try order.id
  const orderId = (order.id || '') as string
  if (orderId) {
    const dep = await getDepositByInvoiceId(orderId)
    if (dep) { console.log(`[Webhook] Matched by orderId: ${orderId}`); return dep }
  }

  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-pandabase-signature') || ''

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event || payload.type

    console.log(`[Webhook] Event: ${event}`)
    console.log(`[Webhook] Payload: ${JSON.stringify(payload).slice(0, 2000)}`)

    switch (event) {
      case 'payment.success':
      case 'PAYMENT_COMPLETED': {
        const deposit = await findDeposit(payload)
        if (!deposit) {
          console.warn('[Webhook] No deposit matched')
          return NextResponse.json({ received: true })
        }
        const claimed = await claimPendingDeposit(deposit.id)
        if (!claimed) {
          console.log(`[Webhook] Already claimed: ${deposit.id}`)
          return NextResponse.json({ received: true })
        }
        const credited = await addToWallet(deposit.userId, deposit.amount)
        if (!credited) {
          console.error(`[Webhook] CRITICAL: addToWallet returned null for deposit ${deposit.id} ($${deposit.amount}) — wallet may be at max`)
          await logError({ where: 'deposit.credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, amount: deposit.amount } })
          break
        }
        createLedgerEntry({
          type: 'deposit',
          userId: deposit.userId,
          amount: deposit.amount,
          description: `Fiat deposit: $${deposit.amount}`,
          relatedId: deposit.id,
        }).catch(err => console.error('Ledger write failed (fiat deposit):', err))
        const user = await getUser(deposit.userId)
        await notifyDeposit(user?.name || deposit.userId, deposit.amount)
        console.log(`[Webhook] Deposit completed: ${deposit.id} ($${deposit.amount})`)
        break
      }

      case 'payment.failed':
      case 'PAYMENT_FAILED': {
        const deposit = await findDeposit(payload)
        if (deposit && deposit.status === 'pending') {
          const { prisma } = await import('@/lib/prisma')
          await prisma.deposit.updateMany({
            where: { id: deposit.id, status: 'pending' },
            data: { status: 'failed', updatedAt: new Date().toISOString() },
          })
          console.log(`[Webhook] Failed: ${deposit.id}`)
        }
        break
      }

      case 'payment.refunded':
      case 'PAYMENT_REFUNDED': {
        const deposit = await findDeposit(payload)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyRefund(user?.name || deposit.userId, deposit.amount, deposit.pandabaseInvoiceId)
        }
        break
      }

      case 'payment.disputed':
      case 'PAYMENT_DISPUTED': {
        const deposit = await findDeposit(payload)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyDispute(user?.name || deposit.userId, deposit.amount, deposit.pandabaseInvoiceId)

          // Auto-blacklist the user who filed a dispute
          await flagAndBlacklist({
            ip: 'dispute-auto',
            userId: deposit.userId,
            reason: `Payment dispute filed on deposit ${deposit.id} ($${deposit.amount})`,
            endpoint: '/api/webhooks/pandabase',
          })
          console.log(`[Webhook] DISPUTE: Auto-blacklisted user ${deposit.userId} (${user?.name})`)
        }
        break
      }

      default:
        console.log(`[Webhook] Unhandled: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Error:', error)
    await logError({ where: 'webhook.pandabase.exception', error })
    return NextResponse.json({ received: true })
  }
}
