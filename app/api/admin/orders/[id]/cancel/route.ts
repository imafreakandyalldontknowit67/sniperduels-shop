import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrder, updateOrder, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock, updateVendorDepositStatus, addVendorStock } from '@/lib/storage'

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
  const isVendorDeposit = order.notes?.startsWith('vendor-deposit:')
  const cancelNote = isVendorDeposit
    ? 'Cancelled by admin — vendor deposit'
    : 'Cancelled by admin — wallet refunded'
  const updated = await updateOrder(id, {
    status: 'failed',
    notes: order.notes ? `${order.notes} | ${cancelNote}` : cancelNote,
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

  // Vendor deposit orders: just mark deposit as failed, no wallet refund needed
  if (isVendorDeposit) {
    const depositId = order.notes!.replace('vendor-deposit:', '')
    await updateVendorDepositStatus(depositId, 'failed')
    return NextResponse.json({ order: updated })
  }

  // Vendor withdrawal: refund vendor stock (was deducted at submission)
  const isVendorWithdrawal = order.notes?.startsWith('vendor-withdrawal:')
  if (isVendorWithdrawal) {
    await addVendorStock(order.userId, order.quantity)
    return NextResponse.json({ order: updated })
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
