import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { getBotLastHeartbeat, setBotHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

const HEARTBEAT_FILE = path.join('/tmp', 'bot-heartbeat.txt')

function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let gemBalance: number | undefined
  const contentType = request.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    try {
      const body = await request.json()
      gemBalance = typeof body.gemBalance === 'number' ? body.gemBalance : undefined
    } catch { /* ignore parse errors */ }
  }

  setBotHeartbeat(gemBalance)
  // Write to shared file so /api/bot/status can read it from any process
  try { fs.writeFileSync(HEARTBEAT_FILE, String(Date.now())) } catch {}
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lastHeartbeat = await getBotLastHeartbeat()
  const now = Date.now()
  const ago = lastHeartbeat ? Math.floor((now - lastHeartbeat) / 1000) : null

  return NextResponse.json({
    lastHeartbeat: lastHeartbeat || null,
    secondsAgo: ago,
    online: lastHeartbeat > 0 && (now - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS,
  })
}
