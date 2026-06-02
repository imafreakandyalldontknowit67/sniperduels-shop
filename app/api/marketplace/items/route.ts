/**
 * Public marketplace listings — anyone can browse.
 * Filters: ?type=sniper|knife, ?weapon=AWP, ?rarity=EPIC, ?maxUsd=10
 *
 * ?demo=1 returns a curated set of hardcoded filler listings (UX preview).
 * No DB read in that path; safe to use on dev servers pointed at prod.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDemoListings } from '@/lib/demoListings'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const weapon = url.searchParams.get('weapon')
  const rarity = url.searchParams.get('rarity')
  const maxUsd = url.searchParams.get('maxUsd')
  const demoForced = process.env.DEMO_MARKETPLACE_DEFAULT === '1'
  const demo = demoForced || url.searchParams.get('demo') === '1'
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '60'), 200)

  if (demo) {
    let demoListings = getDemoListings()
    if (type) demoListings = demoListings.filter(l => l.vaultItem.catalog.type === type)
    if (weapon) demoListings = demoListings.filter(l => l.vaultItem.catalog.weapon === weapon.toUpperCase())
    if (rarity) demoListings = demoListings.filter(l => l.vaultItem.fingerprint.rarity === rarity)
    if (maxUsd) demoListings = demoListings.filter(l => Number(l.priceUsd) <= Number(maxUsd))
    return NextResponse.json({ listings: demoListings.slice(0, limit), count: demoListings.length, demo: true })
  }

  const listings = await prisma.vendorItemListing.findMany({
    where: {
      active: true,
      vaultItem: {
        status: 'listed',
        catalog: {
          ...(type ? { type: type as any } : {}),
          ...(weapon ? { weapon: weapon.toUpperCase() } : {}),
        },
      },
      ...(maxUsd ? { priceUsd: { lte: Number(maxUsd) } } : {}),
    },
    include: {
      vaultItem: {
        include: {
          catalog: { select: { name: true, weapon: true, skin: true, type: true, crate: true } },
          owner: { select: { id: true, name: true, displayName: true, avatar: true } },
        },
      },
    },
    orderBy: { priceUsd: 'asc' },
    take: limit,
  })

  // Client-side rarity filter (denorm'd onto fingerprint, not catalog)
  const filtered = rarity
    ? listings.filter(l => {
        const fp: any = l.vaultItem.fingerprint
        return fp?.rarity === rarity
      })
    : listings

  return NextResponse.json({ listings: filtered, count: filtered.length })
}
