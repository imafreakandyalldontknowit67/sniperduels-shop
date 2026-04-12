import { NextResponse } from 'next/server'
import { BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'
import { prisma } from '@/lib/prisma'

export async function GET() {
  let online = false
  let debug: string | null = null
  try {
    const row = await prisma.botState.findUnique({ where: { key: 'lastHeartbeat' } })
    if (row) {
      const lastHeartbeat = parseInt(row.value, 10) || 0
      online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS
      debug = `db=${row.value}, ago=${Math.floor((Date.now() - lastHeartbeat) / 1000)}s, threshold=${BOT_OFFLINE_THRESHOLD_MS / 1000}s`
    } else {
      debug = 'no row found for key=lastHeartbeat'
    }
  } catch (err) {
    debug = `error: ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json(
    { online, debug },
    { headers: { 'Cache-Control': 'no-cache' } }
  )
}
