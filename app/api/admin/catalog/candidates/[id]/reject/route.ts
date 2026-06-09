/**
 * Admin: reject a CatalogCandidate (e.g. OCR garbage, duplicate misread).
 *
 * Body: { reason?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
  try { body = await request.json() } catch { /* empty ok */ }
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null

  const updated = await prisma.catalogCandidate.update({
    where: { id },
    data: {
      status: 'rejected',
      notes: reason,
    },
  })

  return NextResponse.json({ ok: true, candidate: updated })
}
