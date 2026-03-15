import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrders, getUser, updateOrder, addToWallet, addToLifetimeSpend, addGemStock, getStock, updateStockItem } from '@/lib/storage'
import type { Order } from '@/lib/storage'

// Orders older than this are auto-expired (in milliseconds)
const ORDER_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// Time before an unready #1 order gets skipped
const SKIP_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

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
    notes: 'Auto-expired: order timed out after 30 minutes',
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

// Sort orders: ready first, then by skip status, then by creation time
// 1. ready + not skipped (FIFO by createdAt)
// 2. ready + skipped (by skippedAt)
// 3. not ready + not skipped (FIFO by createdAt)
// 4. not ready + skipped (by skippedAt)
function sortOrders(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    // Ready orders come first
    if (a.playerReady !== b.playerReady) {
      return a.playerReady ? -1 : 1
    }
    // Non-skipped orders come before skipped ones
    const aSkipped = !!a.skippedAt
    const bSkipped = !!b.skippedAt
    if (aSkipped !== bSkipped) {
      return aSkipped ? 1 : -1
    }
    // Within same group: skipped orders sort by skippedAt, others by createdAt
    if (aSkipped && bSkipped) {
      return new Date(a.skippedAt!).getTime() - new Date(b.skippedAt!).getTime()
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
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

  // Sort: ready-first queue
  const sorted = sortOrders(activeOrders)

  // Skip logic: if the #1 pending order is not ready and has been waiting >10 min, skip it
  const pendingOnly = sorted.filter(o => o.status === 'pending')
  if (pendingOnly.length > 0) {
    const first = pendingOnly[0]
    if (!first.playerReady && !first.skippedAt) {
      const waitTime = now - new Date(first.createdAt).getTime()
      if (waitTime > SKIP_TIMEOUT_MS) {
        await updateOrder(first.id, { skippedAt: new Date().toISOString() })
        first.skippedAt = new Date().toISOString()
      }
    }
  }

  // Re-sort after potential skip
  const finalOrders = sortOrders(sorted.filter(o => activeOrders.includes(o)))

  const orders = await Promise.all(
    finalOrders.map(async (o) => {
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
        skippedAt: o.skippedAt || null,
        createdAt: o.createdAt,
      }
    })
  )

  return NextResponse.json({ orders })
}
