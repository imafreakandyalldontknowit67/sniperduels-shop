import { prisma } from '@/lib/prisma'
import { setGemStock } from '@/lib/storage'
import { logError } from '@/lib/error-log'

export const BOT_OFFLINE_THRESHOLD_MS = 120_000
// Order-poll signal threshold. The bot polls /api/bot/orders on its work
// loop; if it stops, the work loop is stuck even when the heartbeat thread
// is still alive. 180s = 3x typical poll cadence.
export const BOT_POLL_THRESHOLD_MS = 180_000

// In-memory cache (fast reads, hydrated from DB on first access after deploy)
let lastHeartbeat: number = 0
let lastOrdersPoll: number = 0
let botGemBalance: number | null = null
let hydrated = false
let pollHydrated = false
let lastSyncTime = 0
const SYNC_INTERVAL = 5 * 60_000 // Sync stock every 5 minutes max

export async function getBotLastHeartbeat(): Promise<number> {
  if (lastHeartbeat > 0) return lastHeartbeat

  // After a deploy, hydrate from DB once
  if (!hydrated) {
    hydrated = true
    try {
      const row = await prisma.botState.findUnique({ where: { key: 'lastHeartbeat' } })
      if (row) {
        lastHeartbeat = parseInt(row.value, 10) || 0
      }
    } catch {
      // DB read failed — stay at 0, will recover on next heartbeat
    }
  }
  return lastHeartbeat
}

export async function getBotLastOrdersPoll(): Promise<number> {
  if (lastOrdersPoll > 0) return lastOrdersPoll

  if (!pollHydrated) {
    pollHydrated = true
    try {
      const row = await prisma.botState.findUnique({ where: { key: 'lastOrdersPoll' } })
      if (row) {
        lastOrdersPoll = parseInt(row.value, 10) || 0
      }
    } catch {
      // DB read failed — stay at 0, will recover on next poll
    }
  }
  return lastOrdersPoll
}

export function setBotOrdersPollSeen(): void {
  lastOrdersPoll = Date.now()
  // Fire-and-forget DB write (cheap upsert; no logError needed — high frequency).
  prisma.botState.upsert({
    where: { key: 'lastOrdersPoll' },
    update: { value: String(lastOrdersPoll) },
    create: { key: 'lastOrdersPoll', value: String(lastOrdersPoll) },
  }).catch(err => {
    console.error('[bot-heartbeat] poll write failed:', err instanceof Error ? err.message : String(err))
  })
}

// True liveness: heartbeat thread alive AND work loop polling the queue.
// Heartbeat alone is not enough because the trade bot's heartbeat thread is
// independent of its work loop; if the work loop crashes/hangs, heartbeats
// keep firing and the website would falsely report "online".
export async function isBotEffectivelyOnline(): Promise<{
  online: boolean
  heartbeatAgeMs: number | null
  pollAgeMs: number | null
  reason: 'ok' | 'no_signals' | 'stale_heartbeat' | 'stale_poll'
}> {
  const [hb, poll] = await Promise.all([getBotLastHeartbeat(), getBotLastOrdersPoll()])
  const now = Date.now()
  const heartbeatAgeMs = hb > 0 ? now - hb : null
  const pollAgeMs = poll > 0 ? now - poll : null

  if (hb === 0 && poll === 0) {
    return { online: false, heartbeatAgeMs, pollAgeMs, reason: 'no_signals' }
  }
  if (heartbeatAgeMs === null || heartbeatAgeMs > BOT_OFFLINE_THRESHOLD_MS) {
    return { online: false, heartbeatAgeMs, pollAgeMs, reason: 'stale_heartbeat' }
  }
  if (pollAgeMs === null || pollAgeMs > BOT_POLL_THRESHOLD_MS) {
    return { online: false, heartbeatAgeMs, pollAgeMs, reason: 'stale_poll' }
  }
  return { online: true, heartbeatAgeMs, pollAgeMs, reason: 'ok' }
}

export function getBotGemBalance(): number | null {
  return botGemBalance
}

export function setBotHeartbeat(gemBalance?: number): void {
  lastHeartbeat = Date.now()
  if (gemBalance != null) {
    botGemBalance = gemBalance
    // ── DISABLED 2026-05-10 ──
    // Auto-sync was promoting orphan gems (e.g. cancelled vendor-deposits whose
    // gems already arrived in the bot) into OFFICIAL platform stock. The trade
    // bot's botBalance can include gems that don't legitimately belong to the
    // platform; the formula `botBalance - vendorTotal - pending` treated those
    // as platform inventory. Until the cancel-race is fully closed (see the
    // vendor-deposit cancel handlers), any drift gets reconciled MANUALLY via
    // /admin/gems. botGemBalance still updates above for /api/bot/status and
    // for the pre-flight balance guard at purchase-gems/route.ts:190.
    //
    // const timeSinceSync = Date.now() - lastSyncTime
    // if (timeSinceSync > SYNC_INTERVAL) {
    //   console.log(`[Stock Sync] Triggering sync (${Math.round(timeSinceSync / 1000)}s since last, balance=${gemBalance})`)
    //   syncPlatformStock(gemBalance).catch(err =>
    //     console.error('[Stock Sync] Failed:', err)
    //   )
    // }
  }

  // Fire-and-forget DB write — but log when it fails so we notice cache going stale.
  prisma.botState.upsert({
    where: { key: 'lastHeartbeat' },
    update: { value: String(lastHeartbeat) },
    create: { key: 'lastHeartbeat', value: String(lastHeartbeat) },
  }).catch(err => {
    console.error('[bot-heartbeat] cache write failed:', err instanceof Error ? err.message : String(err))
    logError({ where: 'bot_heartbeat.cache_write_failed', error: err }).catch(() => {})
  })
}

async function syncPlatformStock(botBalanceRaw: number) {
  // Account for gems that are already deducted from stock but not yet sent by the bot
  // (pending/processing orders have already been deducted from GemStock/VendorStock)
  const pendingGems = await prisma.order.aggregate({
    where: { status: { in: ['pending', 'processing'] }, type: 'gems' },
    _sum: { quantity: true },
  })
  const pendingK = pendingGems._sum.quantity ?? 0

  const botBalanceK = Math.floor(botBalanceRaw / 1000)
  const vendorStock = await prisma.vendorGemListing.aggregate({ _sum: { stockK: true } })
  const vendorTotalK = vendorStock._sum.stockK ?? 0

  // Bot balance = platform stock + vendor stock + pending orders (already deducted from counters)
  const platformK = Math.max(0, botBalanceK - vendorTotalK - pendingK)

  const current = await prisma.gemStock.findUnique({ where: { id: 'singleton' } })
  const currentK = current?.balanceInK ?? 0

  if (Math.abs(platformK - currentK) > 1) {
    // Tripwire: never auto-promote more than 25k/tick into platform stock. A
    // big delta usually means orphan gems from a cancelled vendor-deposit race;
    // alert and leave the counter alone so the owner reconciles manually.
    const delta = platformK - currentK
    if (delta > 25_000) {
      console.error(`[Stock Sync] BLOCKED: would promote ${delta}k to platform (current=${currentK}, target=${platformK}). Suspect orphan gems — manual review.`)
      const adminWebhook = process.env.ADMIN_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL
      if (adminWebhook) {
        fetch(adminWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '<@358318461405102080>',
            embeds: [{
              title: '⚠️ Stock Sync Tripwire',
              color: 0xe74c3c,
              description: `Heartbeat tried to promote **${delta}k** into platform stock.\nCurrent: ${currentK}k → Target: ${platformK}k\nBot: ${botBalanceK}k, Vendor: ${vendorTotalK}k, Pending: ${pendingK}k\n\nLikely orphan gems from a cancelled vendor-deposit. Review /admin/gems.`,
              timestamp: new Date().toISOString(),
            }],
          }),
        }).catch(() => {})
      }
      lastSyncTime = Date.now()
      return
    }
    await setGemStock(platformK)
    console.log(`[Stock Sync] ${currentK}k → ${platformK}k (bot: ${botBalanceK}k, vendor: ${vendorTotalK}k, pending: ${pendingK}k)`)
  }
  lastSyncTime = Date.now()
}
