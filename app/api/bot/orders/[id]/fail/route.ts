import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrder, updateOrder, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock, updateVendorDepositStatus } from '@/lib/storage'

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

  let reason = ''
  try {
    const body = await request.json()
    reason = body.reason || ''
  } catch {
    // No body is fine
  }

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

  // Mark as failed FIRST to prevent double-refund race with admin cancel.
  const updated = await updateOrder(id, {
    status: 'failed',
    notes: reason ? `Failed: ${reason}` : 'Failed by trade bot',
  })

  // Re-read to confirm we won the race (admin cancel may have already processed this)
  const confirmed = await getOrder(id)
  if (!confirmed || confirmed.status !== 'failed') {
    return NextResponse.json(
      { error: 'Order was already processed by another request' },
      { status: 409 }
    )
  }

  // Vendor deposit orders: just mark deposit as failed, no refund needed
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    await updateVendorDepositStatus(depositId, 'failed')
    return NextResponse.json({ order: updated })
  }

  // Safe to refund — order is locked as failed by us
  await addToWallet(order.userId, order.totalPrice)
  await addToLifetimeSpend(order.userId, -order.totalPrice)

  // Restore stock
  if (order.type === 'gems') {
    await addGemStock(order.quantity)
  } else {
    const stock = await getStock()
    const stockItem = stock.find(i => i.name === order.itemName)
    if (stockItem) {
      await updateStockItem(stockItem.id, { stock: stockItem.stock + order.quantity })
    }
  }

  return NextResponse.json({ order: updated })
}
