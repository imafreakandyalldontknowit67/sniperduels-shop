/**
 * Discord webhook for item-marketplace ops alerts.
 *
 * Separate channel from the existing gem-ops webhook (lib/discord-webhook.ts).
 * Env: DISCORD_ITEM_OPS_WEBHOOK_URL — falls back silently if unset.
 *
 * Cron + critical paths fire here when:
 *   - Bot daemon offline >5 min during active hours
 *   - DeliveryJob failed with attempts >= 3
 *   - CatalogCandidate queue >50 pending
 *   - High-value listing (>$100) traded
 */
const WEBHOOK_URL = process.env.DISCORD_ITEM_OPS_WEBHOOK_URL || ''

let webhookKilled = false

interface Embed {
  title: string
  description?: string
  color: number   // RGB int — e.g. 0xff5555
  fields?: { name: string; value: string; inline?: boolean }[]
  timestamp?: string
}

async function send(embed: Embed): Promise<void> {
  if (!WEBHOOK_URL || webhookKilled) return
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ timestamp: new Date().toISOString(), ...embed }] }),
    })
    if (!res.ok) {
      const body = await res.text()
      if (body.includes('Unknown Webhook') || body.includes('10015')) {
        webhookKilled = true
        console.error('[item-ops-webhook] webhook URL invalid — stopping retries')
      } else {
        console.error('[item-ops-webhook] non-200:', res.status, body.slice(0, 200))
      }
    }
  } catch (err) {
    console.error('[item-ops-webhook] send failed:', err)
  }
}

export function notifyDeliveryFailedPermanent(jobId: string, vaultItemName: string, lastError: string) {
  return send({
    title: '🚨 Delivery permanently failed',
    description: `Job \`${jobId}\` failed ${3}+ times — manual refund required.`,
    color: 0xff5555,
    fields: [
      { name: 'Item', value: vaultItemName, inline: true },
      { name: 'Last error', value: lastError.slice(0, 1000), inline: false },
    ],
  })
}

export function notifyDeliveryStuckMidTrade(jobId: string, ageMinutes: number) {
  return send({
    title: '⏱️  Delivery stuck in bot_in_trade',
    description: `Job \`${jobId}\` has been mid-trade for ${ageMinutes} min. Bot may be unreachable.`,
    color: 0xffa500,
  })
}

export function notifyCandidateBacklog(pendingCount: number) {
  return send({
    title: '📥 Catalog candidate backlog',
    description: `${pendingCount} pending candidates waiting for admin review at /admin/catalog.`,
    color: 0x3884ff,
  })
}

export function notifyBotOffline(offlineForMinutes: number) {
  return send({
    title: '⚠️ Item-bot offline',
    description: `Heartbeat stale for ${offlineForMinutes} min — buyers can't be delivered to.`,
    color: 0xff5555,
  })
}

export function notifyHighValueSale(orderId: string, itemName: string, priceUsd: number) {
  return send({
    title: '💰 High-value sale',
    description: `\`${orderId}\` — **${itemName}** for $${priceUsd.toFixed(2)}`,
    color: 0x00ff7f,
  })
}
