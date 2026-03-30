import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrder, updateOrder, updateOrderStatus, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock, updateVendorDepositStatus, addVendorStock } from '@/lib/storage'

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

  const isVendorDeposit = order.notes?.startsWith('vendor-deposit:')
  const isPlatformDeposit = order.notes === 'platform-deposit'
  const isPlatformWithdraw = order.notes?.startsWith('platform-withdraw')
  const cancelNote = isVendorDeposit
    ? 'Cancelled by admin — vendor deposit'
    : 'Cancelled by admin — wallet refunded'

  // Atomic transition: only cancel if still pending/processing
  const updated = await updateOrderStatus(id, ['pending', 'processing'], {
    status: 'failed',
    notes: order.notes ? `${order.notes} | ${cancelNote}` : cancelNote,
  })

  if (!updated) {
    return NextResponse.json(
      { error: 'Order was already processed — cannot cancel' },
      { status: 409 }
    )
  }

  // Platform deposit: no refund needed
  if (isPlatformDeposit) {
    return NextResponse.json({ order: updated })
  }

  // Platform withdraw: refund stock
  if (isPlatformWithdraw) {
    await addGemStock(order.quantity)
    return NextResponse.json({ order: updated })
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
