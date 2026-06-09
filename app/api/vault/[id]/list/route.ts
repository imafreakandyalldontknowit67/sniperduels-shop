/**
 * User lists a deposited item at a price. Body: { priceUsd: number, minOfferUsd?: number }
 * Creates a VendorItemListing, flips VaultItem.status: deposited → listed.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MIN_PRICE_USD = 0.10
const MAX_PRICE_USD = 50_000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const price = Number(body.priceUsd)
  if (!Number.isFinite(price) || price < MIN_PRICE_USD || price > MAX_PRICE_USD) {
    return NextResponse.json({ error: `priceUsd must be between $${MIN_PRICE_USD} and $${MAX_PRICE_USD}` }, { status: 400 })
  }
  const minOffer = body.minOfferUsd !== undefined ? Number(body.minOfferUsd) : null
  if (minOffer !== null && (!Number.isFinite(minOffer) || minOffer < 0 || minOffer > price)) {
    return NextResponse.json({ error: 'minOfferUsd must be between 0 and priceUsd' }, { status: 400 })
  }

  const item = await prisma.vaultItem.findUnique({
    where: { id },
    include: { listing: true, delivery: true },
  })
  if (!item || item.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (item.status !== 'deposited' && item.status !== 'listed') {
    return NextResponse.json({ error: `Cannot list — item status is ${item.status}` }, { status: 409 })
  }
  // Hardening 9.8: refuse to re-list during an in-flight delivery (otherwise
  // a buyer could pay for the listing while the bot is mid-trade with a
  // previous buyer of the same item).
  if (item.delivery && item.delivery.status !== 'completed' && item.delivery.status !== 'failed') {
    return NextResponse.json(
      { error: `Delivery job ${item.delivery.id} is ${item.delivery.status} — cannot list` },
      { status: 409 },
    )
  }

  const result = await prisma.$transaction(async tx => {
    const listing = item.listing
      ? await tx.vendorItemListing.update({
          where: { id: item.listing.id },
          data: { priceUsd: price, minOfferUsd: minOffer, active: true },
        })
      : await tx.vendorItemListing.create({
          data: { vaultItemId: item.id, priceUsd: price, minOfferUsd: minOffer },
        })
    await tx.vaultItem.update({
      where: { id: item.id },
      data: { status: 'listed', listedAt: item.listedAt ?? new Date() },
    })
    return listing
  })

  return NextResponse.json({ ok: true, listing: result })
}
