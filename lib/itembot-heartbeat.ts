/**
 * Item-trading bot liveness.
 *
 * Separate from the gem trade bot (lib/bot-heartbeat.ts) because:
 *  - the item bot runs in a different process/host (MuMu emulator + ADB),
 *  - its payload includes a 9-state HealthState (lobby/in_duel/trade_panel/…)
 *    which we surface to the admin so we can tell "is it in a duel" vs "down".
 *
 * Schema (json POSTed to /api/bot/v1/heartbeat):
 *   { state: "lobby" | "in_duel" | "trade_panel" | ... ,
 *     emulatorOnline: bool,
 *     robloxOnline: bool,
 *     inSniperDuels: bool,
 *     adbDevice: "127.0.0.1:7555",
 *     uptimeS: 12345 }
 *
 * Stored in BotState under key "itembot:*" so it doesn't collide with the
 * gem bot's keys.
 */
import { prisma } from '@/lib/prisma'

export const ITEMBOT_OFFLINE_THRESHOLD_MS = 120_000  // 2 min
export const ITEMBOT_KEY = 'itembot:lastHeartbeat'
export const ITEMBOT_PAYLOAD_KEY = 'itembot:lastPayload'

export interface ItemBotPayload {
  state: string
  emulatorOnline?: boolean
  robloxOnline?: boolean
  inSniperDuels?: boolean
  adbDevice?: string
  uptimeS?: number
  [k: string]: any
}

let cachedHeartbeat = 0
let cachedPayload: ItemBotPayload | null = null
let hydrated = false

export async function getItemBotLastHeartbeat(): Promise<number> {
  if (cachedHeartbeat > 0) return cachedHeartbeat
  if (!hydrated) {
    hydrated = true
    try {
      const row = await prisma.botState.findUnique({ where: { key: ITEMBOT_KEY } })
      if (row) cachedHeartbeat = parseInt(row.value, 10) || 0
      const pl = await prisma.botState.findUnique({ where: { key: ITEMBOT_PAYLOAD_KEY } })
      if (pl) {
        try { cachedPayload = JSON.parse(pl.value) } catch { /* ignore */ }
      }
    } catch {
      // DB miss — stay at 0 until next heartbeat
    }
  }
  return cachedHeartbeat
}

export function getItemBotLastPayload(): ItemBotPayload | null {
  return cachedPayload
}

export function setItemBotHeartbeat(payload: ItemBotPayload): void {
  cachedHeartbeat = Date.now()
  cachedPayload = payload
  prisma.botState.upsert({
    where: { key: ITEMBOT_KEY },
    update: { value: String(cachedHeartbeat) },
    create: { key: ITEMBOT_KEY, value: String(cachedHeartbeat) },
  }).catch(err => console.error('[itembot-heartbeat] write failed:', err))
  prisma.botState.upsert({
    where: { key: ITEMBOT_PAYLOAD_KEY },
    update: { value: JSON.stringify(payload) },
    create: { key: ITEMBOT_PAYLOAD_KEY, value: JSON.stringify(payload) },
  }).catch(err => console.error('[itembot-heartbeat] payload write failed:', err))
}

export async function itemBotIsOnline(): Promise<boolean> {
  const ts = await getItemBotLastHeartbeat()
  return ts > 0 && (Date.now() - ts) < ITEMBOT_OFFLINE_THRESHOLD_MS
}
