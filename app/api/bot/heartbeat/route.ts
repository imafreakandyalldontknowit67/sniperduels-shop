import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getBotLastHeartbeat, setBotHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'
import { prisma } from '@/lib/prisma'

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
  // Write to DB via raw SQL so /api/bot/status can read from any process
  const ts = String(Date.now())
  prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "BotState" (key TEXT PRIMARY KEY, value TEXT NOT NULL, "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  ).then(() =>
    prisma.$executeRawUnsafe(
      `INSERT INTO "BotState" (key, value, "updatedAt") VALUES ('lastHeartbeat', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()`,
      ts
    )
  ).catch(() => {})
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
