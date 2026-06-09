/**
 * Item-bot heartbeat endpoint.
 *
 * The MuMu emulator daemon (bot/daemon.py) POSTs here every 30s with its
 * current HealthState + emulator/Roblox liveness. Separate from the gem
 * bot's /api/bot/heartbeat (which is for the legacy Python trade bot).
 *
 * Auth: x-bot-api-key header, compared timing-safe to env BOT_API_KEY.
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { setItemBotHeartbeat, getItemBotLastHeartbeat, getItemBotLastPayload, ITEMBOT_OFFLINE_THRESHOLD_MS } from '@/lib/itembot-heartbeat'

function authenticate(req: NextRequest): boolean {
  const k = req.headers.get('x-bot-api-key')
  if (!k || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(Buffer.from(k), Buffer.from(process.env.BOT_API_KEY))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let payload: any = {}
  try { payload = await request.json() } catch { /* allow empty */ }
  if (!payload || typeof payload !== 'object' || typeof payload.state !== 'string') {
    return NextResponse.json({ error: 'Invalid payload — expecting { state: string, ... }' }, { status: 400 })
  }
  setItemBotHeartbeat(payload)
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const ts = await getItemBotLastHeartbeat()
  const payload = getItemBotLastPayload()
  const now = Date.now()
  return NextResponse.json({
    lastHeartbeat: ts || null,
    secondsAgo: ts ? Math.floor((now - ts) / 1000) : null,
    online: ts > 0 && (now - ts) < ITEMBOT_OFFLINE_THRESHOLD_MS,
    payload,
  })
}
