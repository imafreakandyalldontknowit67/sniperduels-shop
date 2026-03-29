import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrder, updateOrder, addVendorStock, updateVendorDepositStatus, createLedgerEntry } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser || !isAdmin(currentUser.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'pending' && order.status !== 'processing') {
    return NextResponse.json(
      { error: `Order is already ${order.status}` },
      { status: 400 }
    )
  }

  // Require delivery proof for manual completion
  let body: { botTradeId?: string; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body required with botTradeId or reason' },
      { status: 400 }
    )
  }

  // Bot-delivered orders must provide a trade ID
  // Admin override requires an explicit reason (e.g. refund processing, manual delivery)
  if (!body.botTradeId && !body.reason) {
    return NextResponse.json(
      { error: 'Must provide botTradeId (bot delivery proof) or reason (admin override justification)' },
      { status: 400 }
    )
  }

  const completionNotes = body.botTradeId
    ? `Bot delivery confirmed - Trade ID: ${body.botTradeId}`
    : `Admin override by ${currentUser.name} (${currentUser.id}): ${body.reason}`

  const updated = await updateOrder(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    notes: order.notes ? `${order.notes} | ${completionNotes}` : completionNotes,
  })

  // Verify our write stuck (cancel/fail may have raced us)
  const confirmed = await getOrder(id)
  if (confirmed && confirmed.status !== 'completed') {
    return NextResponse.json(
      { error: 'Order was cancelled or failed before completion could finalize' },
      { status: 409 }
    )
  }

  // If this is a vendor deposit order, credit the vendor's stock
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    await updateVendorDepositStatus(depositId, 'completed')
    await addVendorStock(order.userId, order.quantity)
  }

  // Log completed purchase to ledger
  if (order.type === 'gems' && !order.notes?.startsWith('vendor-deposit:') && !order.notes?.startsWith('vendor-withdrawal:')) {
    createLedgerEntry({
      type: 'purchase',
      userId: order.userId,
      amount: order.totalPrice,
      description: `Purchased ${order.quantity}k gems at $${order.pricePerUnit}/k`,
      relatedId: order.id,
    }).catch(err => console.error('Ledger write failed (admin complete):', err))
  }

  return NextResponse.json({ order: updated })
}
