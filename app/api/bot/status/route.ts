import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_OFFLINE_THRESHOLD_MS = 120_000

export async function GET() {
  let online = false
  try {
    // Raw SQL bypasses generated Prisma client model issues
    const rows = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT value FROM "BotState" WHERE key = 'lastHeartbeat' LIMIT 1
    `
    if (rows.length > 0) {
      const lastHeartbeat = parseInt(rows[0].value, 10) || 0
      online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS
    }
  } catch {
    // Table might not exist — report offline
  }

  return NextResponse.json(
    { online },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
