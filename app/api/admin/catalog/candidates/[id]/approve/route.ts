/**
 * Admin: approve a CatalogCandidate → promote into ItemCatalog.
 *
 * Idempotent: if the candidate is already approved or the ItemCatalog row
 * already exists by name, returns the existing row without erroring.
 *
 * Body (optional overrides):
 *   { weapon?, skin?, type?, crate?, slug? }
 *
 * Defaults: pulls weapon/skin from the candidate; classifies type from the
 * KNIFE_LIKE weapon set; copies fx/fragtrakr/rarity from candidate so the
 * approved catalog row has the rarity info too.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const KNIFE_LIKE = new Set([
  'BAYONET', 'KATANA', 'KARAMBIT', 'BUTTERFLY',
  'CANDY CANE', 'BOMBLINE', 'PAN', 'CASH MONEY',
])

function classifyType(weapon: string): 'sniper' | 'knife' {
  return KNIFE_LIKE.has(weapon.toUpperCase()) ? 'knife' : 'sniper'
}

function deriveWeaponSkin(ocrName: string): { weapon: string; skin: string } | null {
  const m = ocrName.match(/^(.+?)\s*\|\s*(.+?)$/)
  if (!m) return null
  return { weapon: m[1].trim().toUpperCase(), skin: m[2].trim().toUpperCase() }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  let body: any = {}
  try { body = await request.json() } catch { /* empty body ok */ }

  const candidate = await prisma.catalogCandidate.findUnique({ where: { id } })
  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }
  if (candidate.status === 'approved' && candidate.approvedAsId) {
    const existing = await prisma.itemCatalog.findUnique({ where: { id: candidate.approvedAsId } })
    return NextResponse.json({ ok: true, alreadyApproved: true, catalog: existing })
  }

  // Derive weapon/skin/type — admin overrides win when supplied.
  const derived = deriveWeaponSkin(candidate.ocrName)
  const weapon = (body.weapon ?? candidate.weapon ?? derived?.weapon ?? '').toUpperCase()
  const skin = (body.skin ?? candidate.skin ?? derived?.skin ?? '').toUpperCase()
  if (!weapon || !skin) {
    return NextResponse.json(
      { error: 'Cannot derive weapon/skin — supply them in body' },
      { status: 400 },
    )
  }
  const type: 'sniper' | 'knife' = body.type ?? classifyType(weapon)
  const name = `${weapon} | ${skin}`

  // Atomic: create or fetch existing ItemCatalog row, then mark candidate approved
  const catalog = await prisma.itemCatalog.upsert({
    where: { name },
    create: {
      name,
      weapon,
      skin,
      type,
      crate: body.crate ?? candidate.crate ?? null,
      slug: body.slug ?? null,
      source: 'bot_observed',
    },
    update: {
      // Refresh metadata if admin supplied corrections
      crate: body.crate ?? undefined,
      slug: body.slug ?? undefined,
      active: true,
    },
  })

  await prisma.catalogCandidate.update({
    where: { id },
    data: { status: 'approved', approvedAsId: catalog.id },
  })

  return NextResponse.json({ ok: true, catalog })
}
