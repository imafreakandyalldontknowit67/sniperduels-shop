import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getUser, createAdminInitiatedPayout } from '@/lib/storage'
import { notifyAdminPayout } from '@/lib/discord-webhook'

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || !isAdmin(currentUser.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { vendorId, amount, paymentMethod, reference, notes } = body || {}

  if (!vendorId || typeof vendorId !== 'string') {
    return NextResponse.json({ error: 'vendorId required' }, { status: 400 })
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
  }
  if (!paymentMethod || typeof paymentMethod !== 'string' || paymentMethod.trim().length === 0) {
    return NextResponse.json({ error: 'paymentMethod required' }, { status: 400 })
  }
  if (typeof notes !== 'string' || notes.trim().length < 5) {
    return NextResponse.json({ error: 'notes required (min 5 chars, describe why)' }, { status: 400 })
  }

  const vendor = await getUser(vendorId)
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const result = await createAdminInitiatedPayout({
    vendorId,
    adminId: currentUser.id,
    adminName: currentUser.name,
    amount,
    paymentMethod: paymentMethod.trim().slice(0, 200),
    reference: typeof reference === 'string' ? reference.trim().slice(0, 200) : '',
    notes: notes.trim().slice(0, 500),
  })

  if (!result) {
    return NextResponse.json({ error: 'Vendor wallet not found' }, { status: 404 })
  }
  if ('error' in result) {
    return NextResponse.json({
      error: `Insufficient balance. Vendor has $${result.currentBalance.toFixed(2)}, cannot pay out $${amount.toFixed(2)}.`,
      currentBalance: result.currentBalance,
    }, { status: 400 })
  }

  const success = result
  console.log(`[ADMIN_PAYOUT] ${currentUser.name}(${currentUser.id}) paid $${amount.toFixed(2)} to ${vendor.name}(${vendorId}) via ${paymentMethod}; balance ${success.previousBalance.toFixed(2)} → ${success.newBalance.toFixed(2)}; payoutId=${success.payout.id}`)

  notifyAdminPayout({
    adminName: currentUser.name,
    vendorName: vendor.name,
    vendorId,
    amount,
    paymentMethod: paymentMethod.trim(),
    reference: typeof reference === 'string' ? reference.trim() : undefined,
    beforeBalance: success.previousBalance,
    afterBalance: success.newBalance,
    notes: notes.trim(),
  }).catch(err => console.error('[AdminPayout] Webhook failed:', err))

  const response = NextResponse.json({
    success: true,
    payoutId: success.payout.id,
    payout: success.payout,
    previousBalance: success.previousBalance,
    newBalance: success.newBalance,
  })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return response
}
