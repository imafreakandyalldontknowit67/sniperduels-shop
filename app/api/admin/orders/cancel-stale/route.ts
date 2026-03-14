import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getOrders, updateOrder, addToWallet, addToLifetimeSpend, addGemStock, getStock, updateStockItem } from '@/lib/storage'

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
    // Mark as failed
    await updateOrder(order.id, {
      status: 'failed',
      notes: 'Mass cancelled by admin — wallet refunded',
    })

    // Refund wallet and reverse lifetime spend
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

    cancelled++
  }

  return NextResponse.json({ cancelled })
}
