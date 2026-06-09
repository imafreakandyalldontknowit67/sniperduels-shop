/**
 * Admin-facing read of the item bot's last heartbeat + payload (state, emulator
 * online, Roblox online, in Sniper Duels). Backs the BotStatus item-bot tile.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getItemBotLastHeartbeat, getItemBotLastPayload, ITEMBOT_OFFLINE_THRESHOLD_MS } from '@/lib/itembot-heartbeat'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const ts = await getItemBotLastHeartbeat()
  const payload = getItemBotLastPayload()
  const now = Date.now()
  return NextResponse.json({
    lastHeartbeat: ts || null,
    secondsAgo: ts ? Math.floor((now - ts) / 1000) : null,
    online: ts > 0 && (now - ts) < ITEMBOT_OFFLINE_THRESHOLD_MS,
    state: payload?.state ?? null,
    emulatorOnline: payload?.emulatorOnline ?? null,
    robloxOnline: payload?.robloxOnline ?? null,
    inSniperDuels: payload?.inSniperDuels ?? null,
    adbDevice: payload?.adbDevice ?? null,
    uptimeS: payload?.uptimeS ?? null,
  })
}
