import { NextResponse } from 'next/server'
import { isBotEffectivelyOnline } from '@/lib/bot-heartbeat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  // True liveness = heartbeat AND order-poll both fresh. The heartbeat thread
  // can stay alive while the work loop is dead/stuck; using the order-poll
  // signal catches that case so the offline banner actually shows.
  const { online, heartbeatAgeMs, pollAgeMs, reason } = await isBotEffectivelyOnline()

  // offlineSinceMs: time since the bot last looked fully alive on either
  // signal. min() picks the freshest of (heartbeat, poll) — the bot was
  // healthy at most that long ago. null when online or no signals exist yet.
  let offlineSinceMs: number | null = null
  if (!online) {
    const ages = [heartbeatAgeMs, pollAgeMs].filter((a): a is number => a !== null)
    if (ages.length > 0) offlineSinceMs = Math.min(...ages)

    // Open an OutageEvent if none is currently open
    prisma.outageEvent.findFirst({ where: { endedAt: null } })
      .then(existing => {
        if (!existing) {
          return prisma.outageEvent.create({
            data: { reason },
          }).then(ev => {
            console.log(`[Status] Opened OutageEvent ${ev.id} — reason: ${reason}`)
          })
        }
      })
      .catch(err => console.error('[Status] Failed to open OutageEvent:', err))
  }

  return NextResponse.json(
    { online, offlineSinceMs, reason },
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } }
  )
}
