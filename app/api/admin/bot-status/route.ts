import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getBotLastHeartbeat } from '@/app/api/bot/heartbeat/route'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lastHeartbeat = getBotLastHeartbeat()
  const now = Date.now()
  const secondsAgo = lastHeartbeat ? Math.floor((now - lastHeartbeat) / 1000) : null

  return NextResponse.json({
    lastHeartbeat: lastHeartbeat || null,
    secondsAgo,
    online: lastHeartbeat > 0 && (now - lastHeartbeat) < 60_000,
  })
}
