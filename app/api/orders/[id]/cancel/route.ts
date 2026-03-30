import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrder, updateOrder, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock, updateVendorDepositStatus, addVendorStock } from '@/lib/storage'

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

  // Detect special order types before overwriting notes
  const isPlatformDeposit = order.notes === 'platform-deposit'
  const isPlatformWithdraw = order.notes?.startsWith('platform-withdraw')
  const isVendorDeposit = order.notes?.startsWith('vendor-deposit:')
  const isVendorWithdrawal = order.notes?.startsWith('vendor-withdrawal:')

  // Mark as failed FIRST to prevent race with bot complete.
  const updated = await updateOrder(id, {
    status: 'failed',
    notes: order.notes ? `${order.notes} | Cancelled by user` : 'Cancelled by user',
  })

  // Re-read order to confirm we won the race
  const confirmed = await getOrder(id)
  if (!confirmed || confirmed.status !== 'failed') {
    return NextResponse.json(
      { error: 'Order was completed by bot before cancel could take effect' },
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

  // Vendor deposit: mark deposit as failed, no wallet refund needed
  if (isVendorDeposit) {
    const depositId = order.notes!.split('vendor-deposit:')[1]
    await updateVendorDepositStatus(depositId, 'failed')
    return NextResponse.json({ order: updated })
  }

  // Vendor withdrawal: refund vendor stock (was deducted at submission)
  if (isVendorWithdrawal) {
    await addVendorStock(order.userId, order.quantity)
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
