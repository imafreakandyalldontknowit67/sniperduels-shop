import { getOrders, updateOrderStatus, addToWallet, addToLifetimeSpend, addGemStock, getStock, updateStockItem, updateVendorDepositStatus, addVendorStock } from '@/lib/storage'

/**
 * Expire/cancel a single order and process refunds.
 * Handles all order types: platform, vendor, deposits, withdrawals.
 */
export async function expireOrder(
  order: { id: string; userId: string; totalPrice: number; type: string; itemName: string; quantity: number; notes?: string; vendorListingId?: string },
  reason: string
) {
  const expired = await updateOrderStatus(order.id, ['pending', 'processing'], {
    status: 'failed',
    notes: order.notes
      ? `${order.notes} | ${reason}`
      : reason,
  })
  if (!expired) return false

  // Platform withdraw: refund stock
  if (order.notes?.startsWith('platform-withdraw')) {
    await addGemStock(order.quantity)
    return true
  }

  // Platform deposit: no refund needed
  if (order.notes === 'platform-deposit') return true

  // Vendor deposit: mark deposit as failed, no refund
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    await updateVendorDepositStatus(depositId, 'failed')
    return true
  }

  // Vendor withdrawal: refund vendor stock
  if (order.notes?.startsWith('vendor-withdrawal:')) {
    const vendorId = order.notes.replace('vendor-withdrawal:', '')
    await addVendorStock(vendorId, order.quantity)
    return true
  }

  // Regular order: refund wallet + restore stock
  await addToWallet(order.userId, order.totalPrice)
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

  return true
}

/**
 * Cancel all pending orders and refund them.
 * Used when bot goes offline and comes back online.
 */
export async function cancelAllPendingOrders(reason: string): Promise<number> {
  const allOrders = await getOrders()
  const pending = allOrders.filter(o => o.status === 'pending')
  let cancelled = 0
  for (const order of pending) {
    const ok = await expireOrder(order, reason)
    if (ok) cancelled++
  }
  return cancelled
}
