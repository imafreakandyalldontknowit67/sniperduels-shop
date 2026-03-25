import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrder, updateOrder, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock, updateVendorDepositStatus } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.userId !== currentUser.id) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 })
  }

  if (order.status !== 'pending') {
    return NextResponse.json(
      { error: `Order is already ${order.status}` },
      { status: 400 }
    )
  }

  // Mark as failed FIRST to prevent race with bot complete.
  const updated = await updateOrder(id, {
    status: 'failed',
    notes: 'Cancelled by user',
  })

  // Re-read order to confirm we won the race
  const confirmed = await getOrder(id)
  if (!confirmed || confirmed.status !== 'failed') {
    return NextResponse.json(
      { error: 'Order was completed by bot before cancel could take effect' },
      { status: 409 }
    )
  }

  // Check if this is a vendor deposit order
  const isVendorDeposit = order.notes?.startsWith('vendor-deposit:')
  if (isVendorDeposit) {
    const depositId = order.notes!.split('vendor-deposit:')[1]
    await updateVendorDepositStatus(depositId, 'failed')
    // No wallet refund for vendor deposits
    return NextResponse.json({ order: updated })
  }

  // Regular order: refund wallet, subtract lifetime spend, restore stock
  await addToWallet(order.userId, order.totalPrice)
  await addToLifetimeSpend(order.userId, -order.totalPrice)

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
