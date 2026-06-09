/**
 * "Similar listings" — recommendations next to the detail page.
 *
 *   Tier 1: same skin (different conditions, FX, FT, kill counts)  — best
 *   Tier 2: same weapon (other skins)                              — good
 *   Tier 3: same rarity                                            — filler
 *
 * Returns up to ?limit=6 listings, deduped (no current item).
 *
 * Demo mode (DEMO_MARKETPLACE_DEFAULT=1 OR demo-* id) sources from the
 * hardcoded demo set so the designer sees a populated funnel.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDemoListings, findDemoListing, isDemoId } from '@/lib/demoListings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '6'), 12)
  const demo = isDemoId(id) || process.env.DEMO_MARKETPLACE_DEFAULT === '1'

  if (demo) {
    const current = findDemoListing(id)
    if (!current) return NextResponse.json({ listings: [] })
    const all = getDemoListings().filter(l => l.id !== id)
    const sameSkin = all.filter(l => l.vaultItem.catalog.name === current.vaultItem.catalog.name)
    const sameWeapon = all.filter(l =>
      l.vaultItem.catalog.weapon === current.vaultItem.catalog.weapon &&
      l.vaultItem.catalog.name !== current.vaultItem.catalog.name
    )
    const sameRarity = all.filter(l =>
      l.vaultItem.fingerprint.rarity === current.vaultItem.fingerprint.rarity &&
      l.vaultItem.catalog.weapon !== current.vaultItem.catalog.weapon
    )
    const merged: typeof all = []
    const seen = new Set<string>()
    for (const list of [sameSkin, sameWeapon, sameRarity]) {
      for (const l of list) {
        if (seen.has(l.id)) continue
        seen.add(l.id)
        merged.push(l)
        if (merged.length >= limit) break
      }
      if (merged.length >= limit) break
    }
    return NextResponse.json({ listings: merged, demo: true })
  }

  // Real listings — query DB
  const current = await prisma.vendorItemListing.findUnique({
    where: { id },
    include: { vaultItem: { include: { catalog: true } } },
  })
  if (!current) return NextResponse.json({ listings: [] })

  const baseInclude = {
    vaultItem: {
      include: {
        catalog: { select: { name: true, weapon: true, skin: true, type: true, crate: true } },
        owner: { select: { id: true, name: true, displayName: true, avatar: true } },
      },
    },
  } as const

  const sameSkin = await prisma.vendorItemListing.findMany({
    where: {
      id: { not: id },
      active: true,
      vaultItem: { status: 'listed', catalog: { name: current.vaultItem.catalog.name } },
    },
    include: baseInclude,
    take: limit,
    orderBy: { priceUsd: 'asc' },
  })

  const remaining = limit - sameSkin.length
  let sameWeapon: typeof sameSkin = []
  if (remaining > 0) {
    sameWeapon = await prisma.vendorItemListing.findMany({
      where: {
        id: { not: id },
        active: true,
        vaultItem: {
          status: 'listed',
          catalog: {
            weapon: current.vaultItem.catalog.weapon,
            name: { not: current.vaultItem.catalog.name },
          },
        },
      },
      include: baseInclude,
      take: remaining,
      orderBy: { priceUsd: 'asc' },
    })
  }

  return NextResponse.json({ listings: [...sameSkin, ...sameWeapon] })
}
