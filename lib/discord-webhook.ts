const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''

// Once Discord returns "Unknown Webhook" (10015) we stop trying — the URL points
// at a webhook the user deleted. Without this flag we retry on every payment,
// log a 404 each time, and add ~200ms to each request for nothing.
let webhookKilled = false

interface Embed {
  title: string
  color: number
  fields: { name: string; value: string; inline?: boolean }[]
  timestamp?: string
}

async function sendEmbed(embed: Embed): Promise<void> {
  if (!WEBHOOK_URL || webhookKilled) return
  const startedAt = Date.now()
  const type = embed.title || 'unknown'
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ ...embed, timestamp: new Date().toISOString() }] }),
      signal: AbortSignal.timeout(5000),
    })
    const dur = Date.now() - startedAt
    if (!res.ok) {
      const body = await res.text()
      console.error(`[Discord Webhook] sent type="${type}" status=${res.status} dur=${dur}ms err=${body.slice(0, 200)}`)
      // Discord returns 404 with JSON `{"code":10015,"message":"Unknown Webhook"}`
      // when the webhook was deleted. Latch the kill switch.
      if (res.status === 404 && body.includes('"code": 10015')) {
        webhookKilled = true
        console.error('[Discord Webhook] Webhook deleted on Discord side — disabling until restart. Update DISCORD_WEBHOOK_URL env to re-enable.')
      }
      return
    }
    console.log(`[Discord Webhook] sent type="${type}" status=${res.status} dur=${dur}ms`)
  } catch (error) {
    const dur = Date.now() - startedAt
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`[Discord Webhook] timeout type="${type}" dur=${dur}ms`)
    } else {
      console.error(`[Discord Webhook] network error type="${type}" dur=${dur}ms err=${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export async function notifyRefund(userName: string, amount: number, invoiceId: string): Promise<void> {
  await sendEmbed({
    title: 'Payment Refunded',
    color: 0xe67e22, // orange
    fields: [
      { name: 'User', value: userName, inline: true },
      { name: 'Amount', value: `$${amount.toFixed(2)}`, inline: true },
      { name: 'Invoice', value: invoiceId, inline: false },
    ],
  })
}

export async function notifyDispute(userName: string, amount: number, invoiceId: string): Promise<void> {
  await sendEmbed({
    title: 'Payment Disputed',
    color: 0xe74c3c, // red
    fields: [
      { name: 'User', value: userName, inline: true },
      { name: 'Amount', value: `$${amount.toFixed(2)}`, inline: true },
      { name: 'Invoice', value: invoiceId, inline: false },
    ],
  })
}

export async function notifyPurchase(userName: string, itemName: string, quantity: number, totalPrice: number): Promise<void> {
  await sendEmbed({
    title: 'Order Placed',
    color: 0x3498db, // blue
    fields: [
      { name: 'User', value: userName, inline: true },
      { name: 'Item', value: quantity > 1 ? `${itemName} x${quantity}` : itemName, inline: true },
      { name: 'Total', value: `$${totalPrice.toFixed(2)}`, inline: true },
    ],
  })
}
