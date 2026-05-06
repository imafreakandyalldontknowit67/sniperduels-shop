import { NextResponse } from 'next/server'
import { getBotLastHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

export const dynamic = 'force-dynamic'

export async function GET() {
  const lastHeartbeat = await getBotLastHeartbeat()
  const now = Date.now()
  const online = lastHeartbeat > 0 && (now - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS

  // offlineSinceMs: how long the bot has been offline, in ms. null when online.
  // The frontend uses this to gate outage UI (e.g., circuit-breaker that
  // suppresses the deposit-and-notify CTA after extended outages).
  const offlineSinceMs = online || lastHeartbeat === 0 ? null : now - lastHeartbeat

  return NextResponse.json(
    { online, offlineSinceMs },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
