import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getBotLastHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lastHeartbeat = await getBotLastHeartbeat()
  const now = Date.now()
  const secondsAgo = lastHeartbeat ? Math.floor((now - lastHeartbeat) / 1000) : null

  return NextResponse.json({
    lastHeartbeat: lastHeartbeat || null,
    secondsAgo,
    online: lastHeartbeat > 0 && (now - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS,
  })
}
