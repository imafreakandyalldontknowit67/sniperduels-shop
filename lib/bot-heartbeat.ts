import { prisma } from '@/lib/prisma'

export const BOT_OFFLINE_THRESHOLD_MS = 120_000

// In-memory cache (fast reads, hydrated from DB on first access after deploy)
let lastHeartbeat: number = 0
let botGemBalance: number | null = null
let hydrated = false

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
  if (gemBalance != null) botGemBalance = gemBalance

  // Fire-and-forget DB write
  prisma.botState.upsert({
    where: { key: 'lastHeartbeat' },
    update: { value: String(lastHeartbeat) },
    create: { key: 'lastHeartbeat', value: String(lastHeartbeat) },
  }).catch(() => {})
}
