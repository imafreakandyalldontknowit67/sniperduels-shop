import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/pandabase'
import { getDepositByInvoiceId, claimPendingDeposit, addToWallet, getUser } from '@/lib/storage'
import { notifyDeposit, notifyDispute, notifyRefund } from '@/lib/discord-webhook'

export const dynamic = 'force-dynamic'

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

    // Replay protection: reject if timestamp is >5 minutes old
    if (timestamp) {
      const webhookTime = parseInt(timestamp, 10) * 1000
      if (Math.abs(Date.now() - webhookTime) > 5 * 60 * 1000) {
        console.error('[Pandabase Webhook] Timestamp too old')
        return NextResponse.json({ error: 'Stale webhook' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event || payload.type
    const order = payload.data?.order || payload.order || payload.data || {}
    const invoiceId = order.id || order.order_id || order.invoice_id || payload.data?.id

    if (!invoiceId) {
      console.warn('[Pandabase Webhook] No invoice ID in payload:', JSON.stringify(payload).slice(0, 500))
      return NextResponse.json({ received: true })
    }

    console.log(`[Pandabase Webhook] Event: ${event}, Invoice: ${invoiceId}`)

    switch (event) {
      case 'payment.success':
      case 'payment.completed':
      case 'payment_completed':
      case 'PAYMENT_COMPLETED': {
        const deposit = await getDepositByInvoiceId(invoiceId)
        if (!deposit) {
          console.warn(`[Pandabase Webhook] No deposit found for invoice: ${invoiceId}`)
          return NextResponse.json({ received: true })
        }

        // Atomically claim — only first caller wins
        const claimed = await claimPendingDeposit(deposit.id)
        if (!claimed) {
          console.log(`[Pandabase Webhook] Deposit already claimed: ${deposit.id}`)
          return NextResponse.json({ received: true })
        }

        await addToWallet(deposit.userId, deposit.amount)

        // Get username for notification
        const user = await getUser(deposit.userId)
        await notifyDeposit(user?.name || deposit.userId, deposit.amount)

        console.log(`[Pandabase Webhook] Deposit completed: ${deposit.id} ($${deposit.amount})`)
        break
      }

      case 'payment.failed':
      case 'payment_failed':
      case 'PAYMENT_FAILED': {
        const deposit = await getDepositByInvoiceId(invoiceId)
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
        const deposit = await getDepositByInvoiceId(invoiceId)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyRefund(user?.name || deposit.userId, deposit.amount, invoiceId)
          console.log(`[Pandabase Webhook] Refund received for deposit: ${deposit.id}`)
        }
        break
      }

      case 'payment.disputed':
      case 'payment_disputed':
      case 'PAYMENT_DISPUTED': {
        const deposit = await getDepositByInvoiceId(invoiceId)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyDispute(user?.name || deposit.userId, deposit.amount, invoiceId)
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
