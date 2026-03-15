const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''

interface Embed {
  title: string
  color: number
  fields: { name: string; value: string; inline?: boolean }[]
  timestamp?: string
}

async function sendEmbed(embed: Embed): Promise<void> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ ...embed, timestamp: new Date().toISOString() }] }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[Discord Webhook] HTTP ${res.status}: ${body}`)
    }
  } catch (error) {
    console.error('[Discord Webhook] Failed to send:', error)
  }
}

export async function notifyDeposit(userName: string, amount: number): Promise<void> {
  await sendEmbed({
    title: 'Deposit Received',
    color: 0x2ecc71, // green
    fields: [
      { name: 'User', value: userName, inline: true },
      { name: 'Amount', value: `$${amount.toFixed(2)}`, inline: true },
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
