import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrder, updateOrder, updateOrderStatus, addVendorStock, updateVendorDepositStatus, addGemStock, createLedgerEntry } from '@/lib/storage'

function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY)
    )
  } catch {
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const order = await getOrder(id)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Atomic transition: only complete if still pending/processing
  const updated = await updateOrderStatus(id, ['pending', 'processing'], {
    status: 'completed',
    completedAt: new Date().toISOString(),
  })

  if (!updated) {
    return NextResponse.json(
      { error: `Order was already ${order.status} — cannot complete` },
      { status: 409 }
    )
  }

  // If this is a platform deposit order, add to platform gem stock
  if (order.notes === 'platform-deposit') {
    await addGemStock(order.quantity)
    createLedgerEntry({
      type: 'deposit',
      userId: order.userId,
      amount: 0,
      description: `Platform gem deposit: ${order.quantity}k gems added to official stock`,
      relatedId: order.id,
    }).catch(err => console.error('Ledger write failed (platform deposit):', err))
  }

  // If this is a vendor deposit order, mark deposit as completed
  // Stock is already credited by the /api/bot/vendor-deposit endpoint
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    await updateVendorDepositStatus(depositId, 'completed')
  }

  // Vendor withdrawal orders: stock was already deducted at submission time, so just mark complete
  // No additional stock changes needed here
  if (order.notes?.startsWith('vendor-withdrawal:')) {
    // Nothing extra to do — completion is handled by the updateOrder above
  }

  // Log completed purchase to ledger (only on successful delivery)
  if (order.type === 'gems' && order.notes !== 'platform-deposit' && !order.notes?.startsWith('vendor-deposit:') && !order.notes?.startsWith('vendor-withdrawal:')) {
    createLedgerEntry({
      type: 'purchase',
      userId: order.userId,
      amount: order.totalPrice,
      description: `Purchased ${order.quantity}k gems at $${order.pricePerUnit}/k`,
      relatedId: order.id,
    }).catch(err => console.error('Ledger write failed (purchase complete):', err))

    // If vendor sale, also log vendor earning
    if (order.vendorListingId && order.vendorListingId !== 'platform') {
      createLedgerEntry({
        type: 'vendor_earning',
        userId: order.vendorListingId,
        amount: order.totalPrice,
        description: `Vendor sale: ${order.quantity}k gems`,
        relatedId: order.id,
      }).catch(err => console.error('Ledger write failed (vendor_earning complete):', err))
    }
  }

  return NextResponse.json({ order: updated })
}
