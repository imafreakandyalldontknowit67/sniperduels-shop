import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getBotLastHeartbeat, setBotHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'
import { settlePendingOrders } from '@/lib/order-expiry'
import { prisma } from '@/lib/prisma'

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

  // Bot came back online — cancel ONLY orders past the auto-expiry threshold and
  // credit them to wallet. Younger orders stay in `pending` so the next bot poll
  // picks them up via normal flow (don't throw away fulfillable demand).
  if (wasOffline) {
    settlePendingOrders('Bot was offline past the 30-minute window — order cancelled, USD credited to your wallet')
      .then(({ cancelled, left }) => {
        if (cancelled > 0 || left > 0) {
          console.log(`[Heartbeat] Bot back online — cancelled ${cancelled} stale orders, left ${left} fresh orders for fulfillment`)
        }
      })
      .catch(err => console.error('[Heartbeat] Failed to settle pending orders:', err))

    // Close any open OutageEvent now that the bot is back online
    prisma.outageEvent.findFirst({
      where: { endedAt: null },
      orderBy: { startedAt: 'desc' },
    })
      .then(outage => {
        if (!outage) return
        const now = new Date()
        const durationSeconds = Math.round((now.getTime() - outage.startedAt.getTime()) / 1000)
        return prisma.outageEvent.update({
          where: { id: outage.id },
          data: { endedAt: now, durationSeconds },
        }).then(() => {
          console.log(`[Heartbeat] Closed OutageEvent ${outage.id} — duration ${durationSeconds}s`)
        })
      })
      .catch(err => console.error('[Heartbeat] Failed to close OutageEvent:', err))
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
