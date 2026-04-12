import { NextResponse } from 'next/server'
import { BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'
import { prisma } from '@/lib/prisma'

export async function GET() {
  let online = false
  try {
    // Read directly from DB to avoid in-memory cache mismatch across processes
    // @ts-expect-error botState model exists in DB
    const row = await prisma.botState.findUnique({ where: { key: 'lastHeartbeat' } })
    if (row) {
      const lastHeartbeat = parseInt(row.value, 10) || 0
      online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS
    }
  } catch {
    // DB read failed — report offline
  }

  return NextResponse.json(
    { online },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
