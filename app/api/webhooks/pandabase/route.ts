import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/pandabase'
import { getDepositByInvoiceId, getDepositByRefId, claimPendingDeposit, addToWallet, getUser } from '@/lib/storage'
import type { Deposit } from '@/lib/storage'
import { notifyDeposit, notifyDispute, notifyRefund } from '@/lib/discord-webhook'

export const dynamic = 'force-dynamic'

// Try multiple strategies to find the matching deposit
async function findDeposit(payload: Record<string, unknown>): Promise<Deposit | undefined> {
  const data = (payload.data || {}) as Record<string, unknown>
  const order = (data.order || data || {}) as Record<string, unknown>
  const items = (order.items || data.items || payload.items || []) as Array<Record<string, unknown>>

  // Strategy 1: Extract ref ID from item name (e.g. "Wallet Deposit - $10.00 #A1B2C3D4")
  for (const item of items) {
    const name = (item.name || '') as string
    const refMatch = name.match(/#([A-Z0-9]+)$/)
    if (refMatch) {
      const deposit = await getDepositByRefId(refMatch[1])
      if (deposit) {
        console.log(`[Pandabase Webhook] Matched by refId: ${refMatch[1]}`)
        return deposit
      }
    }
  }

  // Strategy 2: Match by checkout ID (cs_xxx)
  const checkoutId = (payload.checkoutId || payload.checkout_id ||
    data.checkoutId || data.checkout_id ||
    order.orderNumber || order.order_number || '') as string
  if (checkoutId) {
    const deposit = await getDepositByInvoiceId(checkoutId)
    if (deposit) {
      console.log(`[Pandabase Webhook] Matched by checkoutId: ${checkoutId}`)
      return deposit
    }
  }

  // Strategy 3: Try order ID directly
  const orderId = (order.id || data.id || payload.id || '') as string
  if (orderId) {
    const deposit = await getDepositByInvoiceId(orderId)
    if (deposit) {
      console.log(`[Pandabase Webhook] Matched by orderId: ${orderId}`)
      return deposit
    }
  }

  // Strategy 4: Try orderNumber
  const orderNumber = (order.orderNumber || order.order_number ||
    data.orderNumber || data.order_number || '') as string
  if (orderNumber && orderNumber !== checkoutId) {
    const deposit = await getDepositByInvoiceId(orderNumber)
    if (deposit) {
      console.log(`[Pandabase Webhook] Matched by orderNumber: ${orderNumber}`)
      return deposit
    }
  }

  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-pandabase-signature') || ''
    const timestamp = request.headers.get('x-pandabase-timestamp') || ''

    // Verify HMAC signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[Pandabase Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event || payload.type

    // Replay protection: reject if timestamp is >5 minutes old
    // Pandabase sends timestamp as ISO string in payload or Unix seconds in header
    const tsRaw = timestamp || payload.timestamp
    if (tsRaw) {
      const webhookTime = typeof tsRaw === 'string' && tsRaw.includes('T')
        ? new Date(tsRaw).getTime()
        : parseInt(tsRaw, 10) * 1000
      if (!isNaN(webhookTime) && Math.abs(Date.now() - webhookTime) > 5 * 60 * 1000) {
        console.error(`[Pandabase Webhook] Timestamp too old: ${tsRaw}`)
        return NextResponse.json({ error: 'Stale webhook' }, { status: 401 })
      }
    }

    // Log full payload for debugging (truncated to avoid log spam)
    console.log(`[Pandabase Webhook] Event: ${event}`)
    console.log(`[Pandabase Webhook] Payload: ${JSON.stringify(payload).slice(0, 2000)}`)

    switch (event) {
      case 'payment.success':
      case 'payment.completed':
      case 'payment_completed':
      case 'PAYMENT_COMPLETED': {
        const deposit = await findDeposit(payload)
        if (!deposit) {
          console.warn(`[Pandabase Webhook] No deposit matched for event. Full payload logged above.`)
          return NextResponse.json({ received: true })
        }

        const claimed = await claimPendingDeposit(deposit.id)
        if (!claimed) {
          console.log(`[Pandabase Webhook] Deposit already claimed: ${deposit.id}`)
          return NextResponse.json({ received: true })
        }

        await addToWallet(deposit.userId, deposit.amount)
        const user = await getUser(deposit.userId)
        await notifyDeposit(user?.name || deposit.userId, deposit.amount)
        console.log(`[Pandabase Webhook] Deposit completed: ${deposit.id} ($${deposit.amount})`)
        break
      }

      case 'payment.failed':
      case 'payment_failed':
      case 'PAYMENT_FAILED': {
        const deposit = await findDeposit(payload)
        if (deposit && deposit.status === 'pending') {
          const { prisma } = await import('@/lib/prisma')
          await prisma.deposit.updateMany({
            where: { id: deposit.id, status: 'pending' },
            data: { status: 'failed', updatedAt: new Date().toISOString() },
          })
          console.log(`[Pandabase Webhook] Deposit marked failed: ${deposit.id}`)
        }
        break
      }

      case 'payment.refunded':
      case 'payment_refunded':
      case 'PAYMENT_REFUNDED': {
        const deposit = await findDeposit(payload)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyRefund(user?.name || deposit.userId, deposit.amount, deposit.pandabaseInvoiceId)
          console.log(`[Pandabase Webhook] Refund for deposit: ${deposit.id}`)
        }
        break
      }

      case 'payment.disputed':
      case 'payment_disputed':
      case 'PAYMENT_DISPUTED': {
        const deposit = await findDeposit(payload)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyDispute(user?.name || deposit.userId, deposit.amount, deposit.pandabaseInvoiceId)
          console.log(`[Pandabase Webhook] Dispute for deposit: ${deposit.id}`)
        }
        break
      }

      default:
        console.log(`[Pandabase Webhook] Unhandled event: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Pandabase Webhook] Error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
