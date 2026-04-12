import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_OFFLINE_THRESHOLD_MS = 120_000

export async function GET() {
  let online = false
  try {
    // Use $executeRawUnsafe to check heartbeat age — returns 1 if heartbeat is recent, 0 if not
    // This works because $executeRawUnsafe returns affected row count for UPDATE
    const threshold = Date.now() - BOT_OFFLINE_THRESHOLD_MS
    const count = await prisma.$executeRawUnsafe(
      `UPDATE "BotState" SET "updatedAt" = "updatedAt" WHERE key = 'lastHeartbeat' AND CAST(value AS BIGINT) > $1`,
      String(threshold)
    )
    online = count > 0
  } catch {
    // Table doesn't exist or query failed — offline
  }

  return NextResponse.json(
    { online },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
