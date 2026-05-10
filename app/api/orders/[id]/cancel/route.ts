import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrder, updateOrder, updateOrderStatus, addToWallet, addToLifetimeSpend, getStock, updateStockItem, addGemStock, updateVendorDepositStatus, addVendorStock, getVendorDeposit } from '@/lib/storage'

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

  // Atomic transition: only cancel if still pending
  const updated = await updateOrderStatus(id, 'pending', {
    status: 'failed',
    notes: order.notes ? `${order.notes} | Cancelled by user` : 'Cancelled by user',
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

  // Vendor deposit: refuse cancel if bot may have already received the gems.
  // Status semantics: pending = bot hasn't picked it up yet (safe to cancel),
  // queued = bot has claimed it / may be receiving gems (UNSAFE — would orphan
  // gems and trigger heartbeat sync to promote them to platform stock).
  if (isVendorDeposit) {
    const depositId = order.notes!.split('vendor-deposit:')[1]
    const dep = await getVendorDeposit(depositId)
    if (dep && dep.status !== 'pending') {
      // Re-open the order — user shouldn't have been able to cancel.
      await updateOrder(id, { status: 'pending', notes: order.notes! })
      return NextResponse.json(
        { error: 'Bot may have already received your gems. Contact support to reconcile — do not re-send.' },
        { status: 409 }
      )
    }
    await updateVendorDepositStatus(depositId, 'failed')
    return NextResponse.json({ order: updated })
  }

  // Vendor withdrawal: refund vendor stock (was deducted at submission)
  if (isVendorWithdrawal) {
    await addVendorStock(order.userId, order.quantity)
    return NextResponse.json({ order: updated })
  }

  // Regular order: refund wallet, subtract lifetime spend, restore stock
  await addToWallet(order.userId, order.totalPrice, {
    type: 'refund',
    description: `Refund: order ${order.id} cancelled by user`,
    relatedId: order.id,
  })
  await addToLifetimeSpend(order.userId, -order.totalPrice)

  if (order.type === 'gems') {
    if (order.vendorListingId && order.vendorListingId !== 'platform') {
      await addVendorStock(order.vendorListingId, order.quantity)
    } else {
      await addGemStock(order.quantity)
    }
  } else {
    const stock = await getStock()
    const stockItem = stock.find(i => i.name === order.itemName)
    if (stockItem) {
      await updateStockItem(stockItem.id, { stock: stockItem.stock + order.quantity })
    }
  }

  return NextResponse.json({ order: updated })
}
