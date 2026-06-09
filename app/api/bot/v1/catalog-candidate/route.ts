/**
 * Bot reports an item it OCR'd that isn't in ItemCatalog.
 *
 * Auth: x-bot-api-key header (timing-safe compare against BOT_API_KEY env).
 *
 * Upserts on `ocrName` (canonical "WEAPON | SKIN" uppercase). Repeat sightings
 * increment observedCount + refresh lastSeenAt rather than create duplicate
 * candidate rows. Skips items that already exist in ItemCatalog.
 *
 * Body shape:
 *   {
 *     ocrName: string,        // "DEFAULT | NEWSKIN"
 *     weapon?: string,
 *     skin?: string,
 *     rarity?: string,        // COMMON | UNCOMMON | ... | SECRET (knives = null)
 *     condition?: string,     // MINT CONDITION | STANDARD ISSUE | WELL WORN
 *     fragtrakr?: boolean,
 *     fx?: string,
 *     crate?: string,
 *     screenshotUrl?: string  // optional pointer to a hosted tooltip crop
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY),
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ocrName = typeof body.ocrName === 'string' ? body.ocrName.trim().toUpperCase() : ''
  if (!ocrName || ocrName.length > 120) {
    return NextResponse.json({ error: 'Invalid ocrName' }, { status: 400 })
  }

  // If it's already in the catalog, no candidate needed — bot is out of date.
  // Return 200 with `inCatalog: true` so bot can refresh its local cache.
  const existing = await prisma.itemCatalog.findUnique({ where: { name: ocrName } })
  if (existing) {
    return NextResponse.json({
      ok: true,
      inCatalog: true,
      catalogId: existing.id,
    })
  }

  // Defensive: coerce optional fields, cap string lengths
  const cap = (s: any, n: number) =>
    typeof s === 'string' ? s.slice(0, n) : null

  const data = {
    ocrName,
    weapon: cap(body.weapon, 40),
    skin: cap(body.skin, 80),
    rarity: cap(body.rarity, 24),
    condition: cap(body.condition, 32),
    fragtrakr: body.fragtrakr === true,
    fx: cap(body.fx, 32),
    crate: cap(body.crate, 80),
    screenshotUrl: cap(body.screenshotUrl, 500),
  }

  // Upsert: first sighting creates the row, subsequent sightings bump
  // observedCount + refresh lastSeenAt.
  const candidate = await prisma.catalogCandidate.upsert({
    where: { ocrName },
    create: {
      ...data,
      lastSeenAt: new Date(),
    },
    update: {
      observedCount: { increment: 1 },
      lastSeenAt: new Date(),
      weapon: data.weapon ?? undefined,
      skin: data.skin ?? undefined,
      rarity: data.rarity ?? undefined,
      condition: data.condition ?? undefined,
      fragtrakr: data.fragtrakr || undefined,
      fx: data.fx ?? undefined,
      crate: data.crate ?? undefined,
      screenshotUrl: data.screenshotUrl ?? undefined,
    },
  })

  // Auto-approval: zero-maintenance pipeline. We promote to ItemCatalog when
  // the candidate is high-confidence:
  //   • observedCount >= 3 (the bot saw it in multiple distinct cells)
  //   • parsed weapon is a known catalog weapon (rules out OCR garbage)
  //   • parsed skin is non-empty (rules out chrome-leak fragments)
  // Admin only sees genuinely-ambiguous candidates after this.
  const AUTO_APPROVE_THRESHOLD = 3
  let autoApproved = false
  let promotedCatalogId: string | null = null
  if (
    candidate.status === 'pending'
    && candidate.observedCount >= AUTO_APPROVE_THRESHOLD
    && candidate.weapon
    && candidate.skin
    && candidate.skin.length >= 3
  ) {
    const weapon = candidate.weapon.toUpperCase()
    const skin = candidate.skin.toUpperCase()
    // Cross-check the weapon against existing catalog (any seeded weapon proves
    // the OCR's weapon-half is real). This is conservative: a brand-new weapon
    // type still needs admin review the first time it shows up.
    const weaponSeen = await prisma.itemCatalog.findFirst({
      where: { weapon },
      select: { id: true },
    })
    if (weaponSeen) {
      const KNIFE_LIKE = new Set([
        'BAYONET', 'KATANA', 'KARAMBIT', 'BUTTERFLY',
        'CANDY CANE', 'BOMBLINE', 'PAN', 'CASH MONEY',
      ])
      const type: 'sniper' | 'knife' = KNIFE_LIKE.has(weapon) ? 'knife' : 'sniper'
      const name = `${weapon} | ${skin}`
      const promoted = await prisma.itemCatalog.upsert({
        where: { name },
        create: {
          name, weapon, skin, type,
          crate: candidate.crate ?? null,
          source: 'bot_observed',
        },
        update: { active: true },
      })
      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: { status: 'approved', approvedAsId: promoted.id },
      })
      autoApproved = true
      promotedCatalogId = promoted.id
    }
  }

  return NextResponse.json({
    ok: true,
    inCatalog: autoApproved,
    catalogId: promotedCatalogId,
    candidateId: candidate.id,
    observedCount: candidate.observedCount,
    status: autoApproved ? 'approved' : candidate.status,
    autoApproved,
  })
}
