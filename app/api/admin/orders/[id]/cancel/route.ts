import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrder, updateOrder, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock } from '@/lib/storage'

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

  // Mark as failed FIRST to prevent race with bot complete.
  // If bot reads the order after this write, it will see "failed" and abort.
  const updated = await updateOrder(id, {
    status: 'failed',
    notes: 'Cancelled by admin — wallet refunded',
  })

  // Re-read order to confirm we won the race (status is actually failed)
  const confirmed = await getOrder(id)
  if (!confirmed || confirmed.status !== 'failed') {
    // Bot completed it between our check and update — do NOT refund
    return NextResponse.json(
      { error: 'Order was completed by bot before cancel could take effect' },
      { status: 409 }
    )
  }

  // Safe to refund — order is locked as failed
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
