import { NextResponse } from 'next/server'
import pg from 'pg'

const BOT_OFFLINE_THRESHOLD_MS = 120_000

export async function GET() {
  let online = false
  try {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    const res = await client.query(`SELECT value FROM "BotState" WHERE key = 'lastHeartbeat' LIMIT 1`)
    await client.end()
    if (res.rows.length > 0) {
      const lastHeartbeat = parseInt(res.rows[0].value, 10) || 0
      online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS
    }
  } catch {
    // DB not available — report offline
  }

  return NextResponse.json(
    { online },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
