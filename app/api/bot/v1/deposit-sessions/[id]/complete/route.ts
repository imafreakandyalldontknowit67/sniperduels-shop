/**
 * Bot reports a successful deposit. Creates VaultItem rows for each item that
 * arrived in the bot's inventory, then closes the session.
 *
 * Body:
 *   {
 *     items: [
 *       {
 *         catalogName: "WEAPON | SKIN" (must exist in ItemCatalog),
 *         fingerprint: { rarity, condition, fragtrakr, fx, kills, qskills, crate, exist },
 *         cellHint?: { x1, y1, x2, y2 }   // optional, bot's known location post-trade
 *       },
 *       ...
 *     ]
 *   }
 *
 * Idempotent: if the session is already 'completed', returns the existing
 * vault items without erroring.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateBot } from '@/lib/bot-auth'
import { prisma } from '@/lib/prisma'

/**
 * Coerce arbitrary bot-sent fingerprint data into a valid ItemFingerprint shape.
 * The deposited item is PHYSICALLY in the bot's custody and belongs to the user
 * — we must NEVER drop it over a malformed field, or the user silently loses an
 * item they own. Bad fields are normalized/nulled rather than rejecting the row.
 */
function sanitizeFingerprint(raw: any): Record<string, unknown> {
  const o = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}
  const str = (v: unknown) => (typeof v === 'string' && v.length ? v : null)
  const int = (v: unknown) => {
    const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
  }
  return {
    rarity: str(o.rarity),
    condition: str(o.condition),
    fragtrakr: o.fragtrakr === true,
    fx: str(o.fx),
    kills: int(o.kills),
    quickscope_kills: int(o.quickscope_kills),
    crate: str(o.crate),
    exist: int(o.exist),
    // Preserve extra descriptive fields the bot sends (festive, kill_type) so
    // matching still has them; they don't affect validity.
    festive: o.festive === true,
    kill_type: str(o.kill_type),
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const items: Array<{ catalogName: string; fingerprint: any; cellHint?: any }> =
    Array.isArray(body.items) ? body.items : []

  const session = await prisma.itemDepositSession.findUnique({ where: { id } })
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  if (session.status === 'completed') {
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  // Resolve all catalog rows in one batch
  const names = items.map(i => i.catalogName?.toUpperCase()).filter(Boolean)
  const catalogRows = await prisma.itemCatalog.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  })
  const catalogByName = new Map(catalogRows.map(c => [c.name, c.id]))

  // Create vault items in a transaction with the session update. We NEVER drop
  // an item over a bad fingerprint (sanitize instead). The only unavoidable
  // skip is an unknown catalog name — surfaced explicitly so it can be
  // reconciled (the item is in the bot's custody but can't be FK'd to a row).
  const skippedUnknownCatalog: string[] = []
  const result = await prisma.$transaction(async tx => {
    const created: { id: string; catalogName: string }[] = []
    for (const it of items) {
      const cName = it.catalogName?.toUpperCase()
      const catalogId = cName ? catalogByName.get(cName) : undefined
      if (!catalogId) {
        // Item not in catalog — can't create a FK'd row. Surface loudly so an
        // admin reconciles it against the bot inventory (item is NOT lost,
        // just untracked until the catalog gains this name).
        console.error(`[deposit-complete] UNKNOWN CATALOG NAME, item untracked: ${cName}`)
        skippedUnknownCatalog.push(cName ?? '(empty)')
        continue
      }
      // Sanitize rather than reject — the user owns this item, keep it.
      const fp = sanitizeFingerprint(it.fingerprint)
      const v = await tx.vaultItem.create({
        data: {
          ownerId: session.userId,
          catalogId,
          fingerprint: fp as object,
          status: 'deposited',
          lastCellHint: it.cellHint ?? null,
        },
      })
      created.push({ id: v.id, catalogName: cName! })
    }
    await tx.itemDepositSession.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        detectedItems: items as any,
      },
    })
    return created
  })

  return NextResponse.json({
    ok: true,
    vaultItemIds: result.map(r => r.id),
    created: result.length,
    skipped: skippedUnknownCatalog.length,
    skippedUnknownCatalog,  // names the bot/operator must reconcile
  })
}
