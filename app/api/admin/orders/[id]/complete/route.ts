import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrder, updateOrderStatus, addVendorStock, claimVendorDeposit, addGemStock, createLedgerEntry, createVendorEarning } from '@/lib/storage'

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

  if (!body.botTradeId && !body.reason) {
    return NextResponse.json(
      { error: 'Must provide botTradeId (bot delivery proof) or reason (admin override justification)' },
      { status: 400 }
    )
  }

  const completionNotes = body.botTradeId
    ? `Bot delivery confirmed - Trade ID: ${body.botTradeId}`
    : `Admin override by ${currentUser.name} (${currentUser.id}): ${body.reason}`

  // Atomic transition: only complete if still pending/processing
  const updated = await updateOrderStatus(id, ['pending', 'processing'], {
    status: 'completed',
    completedAt: new Date().toISOString(),
    notes: order.notes ? `${order.notes} | ${completionNotes}` : completionNotes,
  })

  if (!updated) {
    return NextResponse.json(
      { error: 'Order was already processed — cannot complete' },
      { status: 409 }
    )
  }

  // Platform deposit: add to platform stock
  if (order.notes === 'platform-deposit') {
    await addGemStock(order.quantity)
    createLedgerEntry({
      type: 'deposit',
      userId: order.userId,
      amount: 0,
      description: `Platform gem deposit: ${order.quantity}k gems (admin complete)`,
      relatedId: order.id,
    }).catch(err => console.error('Ledger write failed (admin complete platform deposit):', err))
  }

  // Vendor deposit: atomically claim and credit stock
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    const claimed = await claimVendorDeposit(depositId)
    if (claimed) {
      await addVendorStock(order.userId, order.quantity)
    }
  }

  // Log completed purchase to ledger + create vendor earning
  const isRegularPurchase = order.type === 'gems' && order.notes !== 'platform-deposit' && !order.notes?.startsWith('vendor-deposit:') && !order.notes?.startsWith('vendor-withdrawal:') && order.notes !== 'platform-withdraw'
  if (isRegularPurchase) {
    createLedgerEntry({
      type: 'purchase',
      userId: order.userId,
      amount: order.totalPrice,
      description: `Purchased ${order.quantity}k gems at $${order.pricePerUnit}/k`,
      relatedId: order.id,
    }).catch(err => console.error('Ledger write failed (admin complete):', err))

    if (order.vendorListingId && order.vendorListingId !== 'platform') {
      try {
        await createVendorEarning(order.vendorListingId, order.id, order.totalPrice)
      } catch (err) {
        console.error(`CRITICAL: Vendor earning creation failed for order ${order.id}:`, err)
      }
    }
  }

  return NextResponse.json({ order: updated })
}
