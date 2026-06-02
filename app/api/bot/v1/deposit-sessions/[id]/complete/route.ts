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
import { isValidFingerprint } from '@/lib/marketplace'

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

  // Create vault items in a transaction with the session update
  const result = await prisma.$transaction(async tx => {
    const created: { id: string; catalogName: string }[] = []
    for (const it of items) {
      const cName = it.catalogName?.toUpperCase()
      const catalogId = catalogByName.get(cName)
      if (!catalogId) {
        // Item not in catalog — should not happen post Phase 2 auto-approval,
        // but if it does, skip and report back so admin can investigate.
        continue
      }
      // Hardening 9.10: validate fingerprint shape before write. Bot bugs
      // should crash here loudly, not corrupt vault rows.
      const fp = it.fingerprint ?? {}
      if (!isValidFingerprint(fp)) {
        console.error(`[deposit-complete] invalid fingerprint shape for ${cName}:`,
          JSON.stringify(fp).slice(0, 300))
        continue
      }
      const v = await tx.vaultItem.create({
        data: {
          ownerId: session.userId,
          catalogId,
          // Prisma's Json column wants a plain object, not the branded type.
          fingerprint: fp as object,
          status: 'deposited',
          lastCellHint: it.cellHint ?? null,
        },
      })
      created.push({ id: v.id, catalogName: cName })
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
    skipped: items.length - result.length,
  })
}
