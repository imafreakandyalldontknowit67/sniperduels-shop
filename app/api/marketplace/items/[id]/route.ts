/**
 * Single listing detail — for the marketplace item page + buy modal.
 *
 * Returns: listing + vault + catalog + owner (display-safe).
 * Public endpoint; no auth needed (browsing).
 *
 * IDs starting with "demo-" return hardcoded filler (UX preview), no DB read.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findDemoListing, isDemoId } from '@/lib/demoListings'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (isDemoId(id) || process.env.DEMO_MARKETPLACE_DEFAULT === '1') {
    const demoListing = findDemoListing(id)
    if (demoListing) {
      return NextResponse.json({ listing: demoListing }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (isDemoId(id)) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }
    // fall through to DB lookup if demo-default is on but ID isn't demo
  }

  const listing = await prisma.vendorItemListing.findUnique({
    where: { id },
    include: {
      vaultItem: {
        include: {
          catalog: {
            select: { id: true, name: true, weapon: true, skin: true, type: true, crate: true, slug: true },
          },
          owner: { select: { id: true, name: true, displayName: true, avatar: true } },
        },
      },
    },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // Hide inactive / sold listings from public browsing.
  if (!listing.active || listing.vaultItem.status !== 'listed') {
    return NextResponse.json({ error: 'Listing no longer available' }, { status: 410 })
  }

  return NextResponse.json(
    { listing },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
