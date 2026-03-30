import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrder, updateOrder, updateOrderStatus, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock, updateVendorDepositStatus, addVendorStock } from '@/lib/storage'

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

  // Atomic transition: only fail if still pending/processing
  const failNote = reason ? `Failed: ${reason}` : 'Failed by trade bot'
  const updatedNotes = order.notes
    ? `${order.notes} | ${failNote}`
    : failNote
  const updated = await updateOrderStatus(id, ['pending', 'processing'], {
    status: 'failed',
    notes: updatedNotes,
  })

  if (!updated) {
    return NextResponse.json(
      { error: `Order was already ${order.status} — cannot fail` },
      { status: 409 }
    )
  }

  // Platform deposit orders: no refund needed (nothing was deducted)
  if (order.notes === 'platform-deposit') {
    return NextResponse.json({ order: updated })
  }

  // Platform withdraw orders: refund stock (was deducted at submission)
  if (order.notes?.startsWith('platform-withdraw')) {
    await addGemStock(order.quantity)
    return NextResponse.json({ order: updated })
  }

  // Vendor deposit orders: just mark deposit as failed, no refund needed
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    await updateVendorDepositStatus(depositId, 'failed')
    return NextResponse.json({ order: updated })
  }

  // Vendor withdrawal orders: refund vendor stock (was deducted at submission time)
  if (order.notes?.startsWith('vendor-withdrawal:')) {
    await addVendorStock(order.userId, order.quantity)
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
