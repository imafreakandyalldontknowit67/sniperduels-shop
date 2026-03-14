import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrders, getUser, updateOrder, addToWallet, addToLifetimeSpend, addGemStock, getStock, updateStockItem } from '@/lib/storage'

// Orders older than this are auto-expired (in milliseconds)
const ORDER_TIMEOUT_MS = 60 * 60 * 1000 // 1 hour

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

async function expireOrder(order: { id: string; userId: string; totalPrice: number; type: string; itemName: string; quantity: number }) {
  await updateOrder(order.id, {
    status: 'failed',
    notes: 'Auto-expired: order timed out after 1 hour',
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
}

export async function GET(request: NextRequest) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const includeProcessing = searchParams.get('include_processing') === 'true'

  const allOrders = await getOrders()
  const pendingOrProcessing = allOrders.filter(
    o => o.status === 'pending' || (includeProcessing && o.status === 'processing')
  )

  // Auto-expire stale orders
  const now = Date.now()
  const activeOrders = []
  for (const o of pendingOrProcessing) {
    const age = now - new Date(o.createdAt).getTime()
    if (age > ORDER_TIMEOUT_MS) {
      await expireOrder(o)
    } else {
      activeOrders.push(o)
    }
  }

  const orders = await Promise.all(
    activeOrders.map(async (o) => {
      const user = await getUser(o.userId)
      return {
        orderId: o.id,
        robloxUsername: user?.name || o.userName,
        robloxUserId: o.userId,
        itemName: o.itemName,
        type: o.type,
        quantity: o.quantity,
        status: o.status,
        playerReady: o.playerReady || false,
        createdAt: o.createdAt,
      }
    })
  )

  return NextResponse.json({ orders })
}
