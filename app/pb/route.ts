import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/pandabase'
import { getDepositByInvoiceId, claimPendingDeposit, addToWallet, getUser } from '@/lib/storage'
import { notifyDeposit } from '@/lib/discord-webhook'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-pandabase-signature')

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    object: string
    event: {
      type: string
      id: string
      created_at: number
      data: {
        order: { id: string; order_number: string; status: string; amount: number; currency: string }
        transaction: { id: string; status: string; amount: number; fee: number }
      }
    }
  }

  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.event.type !== 'payment.success') {
    return NextResponse.json({ received: true })
  }

  const invoiceId = event.event.id
  const orderData = event.event.data.order
  const amount = orderData.amount / 100 // cents to dollars
  console.log(`[Webhook] payment.success for invoice ${invoiceId} — $${amount.toFixed(2)}`)

  // Always send Discord notification
  const deposit = await getDepositByInvoiceId(invoiceId)
  if (deposit) {
    // Atomically claim the deposit — only the first caller (verify or webhook) wins.
    const claimed = await claimPendingDeposit(deposit.id)

    if (claimed) {
      await addToWallet(deposit.userId, deposit.amount)
      console.log(`[Webhook] Credited $${deposit.amount.toFixed(2)} to user ${deposit.userId}`)

      const user = await getUser(deposit.userId)
      await notifyDeposit(user?.name ?? deposit.userId, deposit.amount)
    } else {
      console.log(`[Webhook] Deposit ${deposit.id} already claimed, skipping`)
    }
  } else {
    // Manual/external payment — just notify Discord
    await notifyDeposit(orderData.order_number || invoiceId, amount)
  }

  return NextResponse.json({ received: true })
}
