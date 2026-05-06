import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getBotLastHeartbeat, setBotHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'
import { cancelAllPendingOrders } from '@/lib/order-expiry'

function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let gemBalance: number | undefined
  const contentType = request.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    try {
      const body = await request.json()
      gemBalance = typeof body.gemBalance === 'number' ? body.gemBalance : undefined
    } catch { /* ignore parse errors */ }
  }

  // Check if bot was offline before this heartbeat
  const prevHeartbeat = await getBotLastHeartbeat()
  const wasOffline = prevHeartbeat > 0 && (Date.now() - prevHeartbeat) > BOT_OFFLINE_THRESHOLD_MS

  setBotHeartbeat(gemBalance)

  // Bot came back online — cancel all stale pending orders and refund
  if (wasOffline) {
    cancelAllPendingOrders('Bot went offline — order auto-cancelled and refunded')
      .then(count => {
        if (count > 0) console.log(`[Heartbeat] Bot back online, cancelled ${count} stale orders`)
      })
      .catch(err => console.error('[Heartbeat] Failed to cancel stale orders:', err))
  }

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lastHeartbeat = await getBotLastHeartbeat()
  const now = Date.now()
  const ago = lastHeartbeat ? Math.floor((now - lastHeartbeat) / 1000) : null

  return NextResponse.json({
    lastHeartbeat: lastHeartbeat || null,
    secondsAgo: ago,
    online: lastHeartbeat > 0 && (now - lastHeartbeat) < BOT_OFFLINE_THRESHOLD_MS,
  })
}
