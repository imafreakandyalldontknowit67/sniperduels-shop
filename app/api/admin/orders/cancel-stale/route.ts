import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrders, updateOrderStatus, addToWallet, addToLifetimeSpend, addGemStock, getStock, updateStockItem, addVendorStock, updateVendorDepositStatus } from '@/lib/storage'

export async function POST() {
  const currentUser = await getCurrentUser()
  if (!currentUser || !isAdmin(currentUser.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allOrders = await getOrders()
  const staleOrders = allOrders.filter(
    o => o.status === 'pending' || o.status === 'processing'
  )

  if (staleOrders.length === 0) {
    return NextResponse.json({ cancelled: 0 })
  }

  let cancelled = 0

  for (const order of staleOrders) {
    // Atomic transition: only cancel if still pending/processing
    const updated = await updateOrderStatus(order.id, ['pending', 'processing'], {
      status: 'failed',
      notes: order.notes
        ? `${order.notes} | Mass cancelled by admin`
        : 'Mass cancelled by admin — wallet refunded',
    })

    if (!updated) continue // Another process already handled this order

    // Platform deposit: no refund
    if (order.notes === 'platform-deposit') { cancelled++; continue }

    // Platform withdraw: refund stock
    if (order.notes?.startsWith('platform-withdraw')) {
      await addGemStock(order.quantity)
      cancelled++; continue
    }

    // Vendor deposit: mark deposit as failed
    if (order.notes?.startsWith('vendor-deposit:')) {
      const depositId = order.notes.replace('vendor-deposit:', '')
      await updateVendorDepositStatus(depositId, 'failed')
      cancelled++; continue
    }

    // Vendor withdrawal: refund vendor stock
    if (order.notes?.startsWith('vendor-withdrawal:')) {
      const vendorId = order.notes.replace('vendor-withdrawal:', '')
      await addVendorStock(vendorId, order.quantity)
      cancelled++; continue
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

    cancelled++
  }

  return NextResponse.json({ cancelled })
}
