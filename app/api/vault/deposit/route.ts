/**
 * User initiates a deposit session.
 *
 * No body required for mode=auto_detect (the default): user clicks
 * "Deposit items", bot will accept whatever they add to a future trade.
 *
 * For mode=declared, body shape:
 *   { mode: 'declared', items: [{ catalogName: "WEAPON | SKIN", fingerprint: {...} }] }
 *
 * Returns { sessionId, expiresAt, joinHint } — frontend shows the user the
 * instructions and polls /api/vault/sessions/[id] for status updates.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimitOr429 } from '@/lib/rate-limit'

const SESSION_TTL_MS = 10 * 60_000  // 10 minutes

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Hardening 11.4: cap deposit-session creations per user — 3 per hour.
  // Prevents a user from spamming pending sessions to grief the bot's
  // job queue.
  const limited = rateLimitOr429(`deposit:${user.id}`, { limit: 3, windowMs: 60 * 60_000 })
  if (limited) return limited

  let body: any = {}
  try { body = await request.json() } catch { /* empty body ok */ }
  const mode = body.mode === 'declared' ? 'declared' : 'auto_detect'
  const declaredItems = mode === 'declared' && Array.isArray(body.items) ? body.items : null

  // One active session per user. If they already have a pending one, return it
  // instead of creating a duplicate.
  const existing = await prisma.itemDepositSession.findFirst({
    where: {
      userId: user.id,
      status: { in: ['pending', 'bot_in_trade', 'awaiting_confirm'] },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    return NextResponse.json({
      sessionId: existing.id,
      expiresAt: existing.expiresAt,
      reused: true,
    })
  }

  const session = await prisma.itemDepositSession.create({
    data: {
      userId: user.id,
      mode,
      declaredItems: declaredItems as any,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  })
  return NextResponse.json({
    sessionId: session.id,
    expiresAt: session.expiresAt,
  })
}
