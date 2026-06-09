/**
 * Cron: monitor item-marketplace health, fire Discord webhooks on threshold breach.
 *
 * Runs every 5 min. Checks:
 *   - DeliveryJobs in 'bot_in_trade' for >15 min (bot stuck)
 *   - Permanently-failed DeliveryJobs (attempts>=3, status='failed') in last hour
 *   - CatalogCandidate backlog >50 pending
 *
 * Auth: x-cron-secret header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import {
  notifyDeliveryFailedPermanent,
  notifyDeliveryStuckMidTrade,
  notifyCandidateBacklog,
} from '@/lib/discord-item-ops'

function authenticateCron(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || !process.env.CRON_SECRET) return false
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(process.env.CRON_SECRET))
  } catch {
    return false
  }
}

const STUCK_AGE_MS = 15 * 60_000
const PERMANENTLY_FAILED_LOOKBACK_MS = 60 * 60_000
const CANDIDATE_BACKLOG_THRESHOLD = 50

export async function POST(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const fired: string[] = []
  const now = Date.now()

  // Stuck deliveries
  const stuck = await prisma.itemDeliveryJob.findMany({
    where: {
      status: 'bot_in_trade',
      startedAt: { lt: new Date(now - STUCK_AGE_MS) },
    },
    select: { id: true, startedAt: true },
  })
  for (const s of stuck) {
    const ageMin = s.startedAt ? Math.floor((now - s.startedAt.getTime()) / 60_000) : 0
    await notifyDeliveryStuckMidTrade(s.id, ageMin)
    fired.push(`stuck:${s.id}`)
  }

  // Permanent fails in last hour
  const permFails = await prisma.itemDeliveryJob.findMany({
    where: {
      status: 'failed',
      completedAt: { gte: new Date(now - PERMANENTLY_FAILED_LOOKBACK_MS) },
      attempts: { gte: 3 },
    },
    include: { vaultItem: { include: { catalog: { select: { name: true } } } } },
  })
  for (const f of permFails) {
    await notifyDeliveryFailedPermanent(f.id, f.vaultItem.catalog.name, f.lastError ?? 'unknown')
    fired.push(`failed:${f.id}`)
  }

  // Candidate backlog
  const candidatePending = await prisma.catalogCandidate.count({
    where: { status: 'pending' },
  })
  if (candidatePending >= CANDIDATE_BACKLOG_THRESHOLD) {
    await notifyCandidateBacklog(candidatePending)
    fired.push(`candidates:${candidatePending}`)
  }

  return NextResponse.json({
    ok: true,
    fired: fired.length,
    details: fired,
    stats: {
      stuckDeliveries: stuck.length,
      permanentFailures: permFails.length,
      candidatePending,
    },
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
