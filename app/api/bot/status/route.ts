import { NextResponse } from 'next/server'
import { getBotLastHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

export async function GET() {
  // Uses in-memory lastHeartbeat set by bot heartbeat POST (same Node process in standalone mode)
  const lastHeartbeat = await getBotLastHeartbeat()
  const online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS

  return NextResponse.json(
    { online },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
