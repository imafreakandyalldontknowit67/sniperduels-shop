/**
 * Buy a listing.
 *
 * Body: { method: 'wallet' | 'pandabase', robloxName?: string }
 *   - method='wallet' (4.5): deducts balance synchronously, creates a
 *     queued ItemDeliveryJob. Bot picks up on next poll.
 *   - method='pandabase' (4.3): creates a pending Order. Caller is expected
 *     to redirect the user to Pandabase checkout for the Order; the
 *     webhook handler flips order → processing and the bot picks up the job.
 *
 * robloxName: optional override. Defaults to the buyer's stored Roblox
 * username — but a user may legitimately want to receive items into a
 * different Roblox account.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { purchaseListing, MarketplaceError } from '@/lib/marketplace'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const method = body.method === 'pandabase' ? 'pandabase' : 'wallet'
  const robloxName = typeof body.robloxName === 'string' && body.robloxName.trim()
    ? body.robloxName.trim().slice(0, 30)
    : user.name

  try {
    const result = await purchaseListing({
      listingId: id,
      buyerId: user.id,
      buyerRobloxName: robloxName,
      method,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    if (err instanceof MarketplaceError) {
      const status =
        err.code === 'LISTING_NOT_FOUND' ? 404 :
        err.code === 'LISTING_INACTIVE' || err.code === 'LISTING_UNAVAILABLE' ? 410 :
        err.code === 'INSUFFICIENT_BALANCE' ? 402 :
        err.code === 'SELF_PURCHASE' ? 403 :
        400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    console.error('[marketplace/buy] unexpected:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
