import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const BOT_OFFLINE_THRESHOLD_MS = 120_000
const HEARTBEAT_FILE = path.join('/tmp', 'bot-heartbeat.txt')

export async function GET() {
  let online = false
  let debug = ''
  try {
    const exists = fs.existsSync(HEARTBEAT_FILE)
    if (exists) {
      const ts = fs.readFileSync(HEARTBEAT_FILE, 'utf-8').trim()
      const lastHeartbeat = parseInt(ts, 10) || 0
      const ago = Math.floor((Date.now() - lastHeartbeat) / 1000)
      online = lastHeartbeat > 0 && (Date.now() - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS
      debug = `file exists, value=${ts}, ago=${ago}s`
    } else {
      debug = `file not found at ${HEARTBEAT_FILE}`
    }
  } catch (err) {
    debug = `read error: ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json(
    { online, debug },
    { headers: { 'Cache-Control': 'no-cache' } }
  )
}
