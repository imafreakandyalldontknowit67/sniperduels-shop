import { prisma } from '@/lib/prisma'
import { setGemStock } from '@/lib/storage'

export const BOT_OFFLINE_THRESHOLD_MS = 120_000

// In-memory cache (fast reads, hydrated from DB on first access after deploy)
let lastHeartbeat: number = 0
let botGemBalance: number | null = null
let hydrated = false
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

export function getBotGemBalance(): number | null {
  return botGemBalance
}

export function setBotHeartbeat(gemBalance?: number): void {
  lastHeartbeat = Date.now()
  if (gemBalance != null) {
    botGemBalance = gemBalance
    // Sync platform stock counter to bot's real balance
    if (Date.now() - lastSyncTime > SYNC_INTERVAL) {
      syncPlatformStock(gemBalance).catch(err =>
        console.error('[Stock Sync] Failed:', err)
      )
    }
  }

  // Fire-and-forget DB write
  prisma.botState.upsert({
    where: { key: 'lastHeartbeat' },
    update: { value: String(lastHeartbeat) },
    create: { key: 'lastHeartbeat', value: String(lastHeartbeat) },
  }).catch(() => {})
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
    await setGemStock(platformK)
    console.log(`[Stock Sync] ${currentK}k → ${platformK}k (bot: ${botBalanceK}k, vendor: ${vendorTotalK}k, pending: ${pendingK}k)`)
  }
  lastSyncTime = Date.now()
}
