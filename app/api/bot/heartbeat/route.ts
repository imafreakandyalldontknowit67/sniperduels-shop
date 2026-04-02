import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getBotLastHeartbeat, setBotHeartbeat } from '@/lib/bot-heartbeat'

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
  try {
    const body = await request.json()
    gemBalance = typeof body.gemBalance === 'number' ? body.gemBalance : undefined
  } catch { /* no body is fine — old bot version */ }

  setBotHeartbeat(gemBalance)
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lastHeartbeat = getBotLastHeartbeat()
  const now = Date.now()
  const ago = lastHeartbeat ? Math.floor((now - lastHeartbeat) / 1000) : null

  return NextResponse.json({
    lastHeartbeat: lastHeartbeat || null,
    secondsAgo: ago,
    online: lastHeartbeat > 0 && (now - lastHeartbeat) < 60_000,
  })
}
