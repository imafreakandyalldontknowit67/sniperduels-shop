import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const BOT_OFFLINE_THRESHOLD_MS = 120_000
const HEARTBEAT_FILE = path.join('/tmp', 'bot-heartbeat.txt')

export async function GET() {
  let online = false
  try {
    const ts = fs.readFileSync(HEARTBEAT_FILE, 'utf-8').trim()
    const lastHeartbeat = parseInt(ts, 10) || 0
    online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS
  } catch {
    // File doesn't exist yet — offline until first heartbeat
  }

  return NextResponse.json(
    { online },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
