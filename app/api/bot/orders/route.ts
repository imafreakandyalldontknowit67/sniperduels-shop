import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrders, getUser, updateOrder, updateOrderStatus, addToWallet, addToLifetimeSpend, addGemStock, getStock, updateStockItem, updateVendorDepositStatus, addVendorStock } from '@/lib/storage'
import type { Order } from '@/lib/storage'

// Orders older than this are auto-expired (in milliseconds)
const ORDER_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// Time before an unready #1 order gets skipped (from when they reach #1, not order creation)
const SKIP_TIMEOUT_MS = 3.5 * 60 * 1000 // 3.5 minutes

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

async function expireOrder(order: { id: string; userId: string; totalPrice: number; type: string; itemName: string; quantity: number; notes?: string; vendorListingId?: string }) {
  // Atomic transition: only expire if still pending/processing. If someone else already handled it, bail out.
  const expired = await updateOrderStatus(order.id, ['pending', 'processing'], {
    status: 'failed',
    notes: order.notes
      ? `${order.notes} | Auto-expired: timed out after 30 minutes`
      : 'Auto-expired: timed out after 30 minutes',
  })
  if (!expired) return // Another process already changed this order — skip refund

  // Platform withdraw: refund stock
  if (order.notes?.startsWith('platform-withdraw')) {
    await addGemStock(order.quantity)
    return
  }

  // Platform deposit: no refund needed
  if (order.notes === 'platform-deposit') return

  // Vendor deposit: mark deposit as failed, no refund
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    await updateVendorDepositStatus(depositId, 'failed')
    return
  }

  // Vendor withdrawal: refund vendor stock
  if (order.notes?.startsWith('vendor-withdrawal:')) {
    const vendorId = order.notes.replace('vendor-withdrawal:', '')
    await addVendorStock(vendorId, order.quantity)
    return
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
  const activeOrders: typeof pendingOrProcessing = []
  for (const o of pendingOrProcessing) {
    const age = now - new Date(o.createdAt).getTime()
    if (age > ORDER_TIMEOUT_MS && o.status === 'pending') {
      await expireOrder(o)
    } else {
      activeOrders.push(o)
    }
  }

  // Sort: ready-first queue
  const sorted = sortOrders(activeOrders)

  // Skip logic: if the #1 pending order is not ready and has been at #1 for >3.5 min, skip it
  const pendingOnly = sorted.filter(o => o.status === 'pending')
  if (pendingOnly.length > 0) {
    const first = pendingOnly[0]
    if (!first.playerReady && !first.skippedAt) {
      if (!first.reachedFrontAt) {
        // First time at #1 — stamp it
        await updateOrder(first.id, { reachedFrontAt: new Date().toISOString() })
        first.reachedFrontAt = new Date().toISOString()
      } else {
        const waitTime = now - new Date(first.reachedFrontAt).getTime()
        if (waitTime > SKIP_TIMEOUT_MS) {
          await updateOrder(first.id, { skippedAt: new Date().toISOString() })
          first.skippedAt = new Date().toISOString()
        }
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
        isVendorDeposit: !!o.notes?.startsWith('vendor-deposit:'),
        isVendorWithdrawal: !!o.notes?.startsWith('vendor-withdrawal:'),
        isPlatformDeposit: o.notes === 'platform-deposit',
        isPlatformWithdraw: !!o.notes?.startsWith('platform-withdraw'),
      }
    })
  )

  return NextResponse.json({ orders })
}
