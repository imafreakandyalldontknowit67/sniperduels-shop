/**
 * Public item-bot liveness — backs the marketplace outage banner.
 *
 * Mirrors /api/bot/status (the gem-bot endpoint) shape, but adds the item
 * bot's `state` field (9-state HealthState) so the banner can emit
 * state-specific copy: in_duel / trade_panel / roblox_down / etc.
 *
 * Strips operator-only fields (emulatorOnline, robloxOnline, adbDevice,
 * uptimeS) — those stay admin-gated via /api/admin/itembot-status.
 */
import { NextResponse } from 'next/server'
import {
  getItemBotLastHeartbeat,
  getItemBotLastPayload,
  ITEMBOT_OFFLINE_THRESHOLD_MS,
} from '@/lib/itembot-heartbeat'

export const dynamic = 'force-dynamic'

export async function GET() {
  const ts = await getItemBotLastHeartbeat()
  const payload = getItemBotLastPayload()
  const now = Date.now()

  const heartbeatAgeMs = ts > 0 ? now - ts : null
  const online = ts > 0 && heartbeatAgeMs !== null && heartbeatAgeMs < ITEMBOT_OFFLINE_THRESHOLD_MS

  const offlineSinceMs = online ? null : heartbeatAgeMs
  const secondsAgo = heartbeatAgeMs !== null ? Math.floor(heartbeatAgeMs / 1000) : null

  return NextResponse.json(
    {
      online,
      state: payload?.state ?? null,
      offlineSinceMs,
      secondsAgo,
    },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } },
  )
}
