/**
 * Bot cancels a deposit session (timeout, user declined trade, OCR failed
 * a verification check, etc.). Body: { reason?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateBot } from '@/lib/bot-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  let body: any = {}
  try { body = await request.json() } catch { /* ok */ }
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null
  const updated = await prisma.itemDepositSession.update({
    where: { id },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  })
  return NextResponse.json({ ok: true, session: updated })
}
