import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/buy-intent/[id]
 *
 * Read + claim a PendingBuyIntent created before OAuth. Auth is required.
 *
 * Behavior:
 * - 401 if not authenticated
 * - 404 if intent not found
 * - 410 (Gone) if intent expired or already consumed
 * - 403 if intent is bound to a different user
 * - On first read by an authed user with userId=null intent → claim it
 *   (set intent.userId = currentUser.id) so subsequent foreign reads 403
 * - Returns { id, listingId, amountK, expiresAt }
 *
 * The intent is NOT marked consumed here — only on actual purchase or via the
 * deposit-completion auto-execute path (B2). That way the user can refresh
 * /gems?resumeBuy=... without losing their place.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const intent = await prisma.pendingBuyIntent.findUnique({
    where: { id },
    select: { id: true, userId: true, listingId: true, amountK: true, expiresAt: true, consumedAt: true },
  })

  if (!intent) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (intent.consumedAt || intent.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }
  if (intent.userId && intent.userId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Claim on first authed read (idempotent; updateMany with where clause to
  // avoid race when multiple tabs hit it concurrently).
  if (!intent.userId) {
    await prisma.pendingBuyIntent.updateMany({
      where: { id, userId: null },
      data: { userId: user.id },
    })
  }

  return NextResponse.json({
    id: intent.id,
    listingId: intent.listingId,
    amountK: intent.amountK,
    expiresAt: intent.expiresAt,
  })
}
