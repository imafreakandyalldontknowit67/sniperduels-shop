import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const INTENT_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * POST /api/buy-intent
 * Body: { listingId: string, amountK: number }
 *
 * Creates a PendingBuyIntent for a logged-out user about to enter the OAuth
 * flow. The intent ID is round-tripped through the `return_to` cookie to
 * /gems?resumeBuy={id}. The intent is consumed on actual purchase or expires
 * after 10 minutes.
 *
 * No auth required — anon users need this. The risk surface is small:
 * - userId is null at creation; first authenticated read claims it
 * - Subsequent reads from a different user return 403
 * - 10-minute TTL prevents long-tail replay
 *
 * NOTE: Server-side validation of listingId/amountK is intentionally minimal
 * here because the actual purchase endpoint (/api/orders/purchase-gems) does
 * full validation against current stock + price. The intent is a UX hint, not
 * a binding contract.
 */
export async function POST(request: NextRequest) {
  let body: { listingId?: unknown; amountK?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const listingId = typeof body.listingId === 'string' ? body.listingId : null
  const amountK = typeof body.amountK === 'number' ? Math.floor(body.amountK) : null

  if (!listingId || listingId.length > 100) {
    return NextResponse.json({ error: 'listingId required' }, { status: 400 })
  }
  if (amountK == null || amountK < 1 || amountK > 1_000_000) {
    return NextResponse.json({ error: 'amountK must be 1-1,000,000' }, { status: 400 })
  }

  const intent = await prisma.pendingBuyIntent.create({
    data: {
      listingId,
      amountK,
      expiresAt: new Date(Date.now() + INTENT_TTL_MS),
    },
    select: { id: true, expiresAt: true },
  })

  return NextResponse.json({ id: intent.id, expiresAt: intent.expiresAt })
}
