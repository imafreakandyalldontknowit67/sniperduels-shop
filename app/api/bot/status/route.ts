import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_OFFLINE_THRESHOLD_MS = 120_000

export async function GET() {
  let online = false
  let debug = ''
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT value FROM "BotState" WHERE key = 'lastHeartbeat' LIMIT 1`
    )
    if (rows.length > 0) {
      const lastHeartbeat = parseInt(rows[0].value, 10) || 0
      const ago = Math.floor((Date.now() - lastHeartbeat) / 1000)
      online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS
      debug = `rows=${rows.length}, val=${rows[0].value}, ago=${ago}s, now=${Date.now()}`
    } else {
      debug = 'no rows returned'
    }
  } catch (e) {
    debug = `query error: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json(
    { online, debug },
    { headers: { 'Cache-Control': 'no-cache' } }
  )
}
