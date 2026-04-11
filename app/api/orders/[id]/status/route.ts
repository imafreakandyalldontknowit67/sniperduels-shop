import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrder, getOrders } from '@/lib/storage'
import type { Order } from '@/lib/storage'

const ESTIMATED_MINUTES_PER_ORDER = 2
const SKIP_TIMEOUT_MS = 3.5 * 60 * 1000 // 3.5 minutes from reaching #1

function isVendorOp(order: Order): boolean {
  return !!order.notes?.startsWith('vendor-deposit:') || !!order.notes?.startsWith('vendor-withdrawal:')
}

// Same sort logic as bot polling — must stay in sync
function sortOrders(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    // 1. Ready orders first
    if (a.playerReady !== b.playerReady) {
      return a.playerReady ? -1 : 1
    }
    // 2. Non-skipped before skipped
    const aSkipped = !!a.skippedAt
    const bSkipped = !!b.skippedAt
    if (aSkipped !== bSkipped) {
      return aSkipped ? 1 : -1
    }
    // 3. Vendor ops before regular orders
    const aVendor = isVendorOp(a)
    const bVendor = isVendorOp(b)
    if (aVendor !== bVendor) {
      return aVendor ? -1 : 1
    }
    // 4. Within same group: by timestamp
    if (aSkipped && bSkipped) {
      return new Date(a.skippedAt!).getTime() - new Date(b.skippedAt!).getTime()
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const order = await getOrder(id)

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    let queuePosition: number | null = null
    let estimatedMinutes: number | null = null
    let totalInQueue = 0
    let showServerLink = false
    let skipDeadline: string | null = null

    if (order.status === 'pending') {
      const allOrders = await getOrders()
      const pendingOrders = allOrders.filter(o => o.status === 'pending')
      const processingCount = allOrders.filter(o => o.status === 'processing').length

      // Sort using ready-first logic (same as bot)
      const sorted = sortOrders(pendingOrders)
      const positionIndex = sorted.findIndex(o => o.id === order.id)

      queuePosition = positionIndex + processingCount + 1
      totalInQueue = pendingOrders.length
      estimatedMinutes = queuePosition * ESTIMATED_MINUTES_PER_ORDER

      // Only show server link when at position #1 (and no order is currently processing)
      showServerLink = queuePosition === 1

      // If at #1 and not ready, show when they'll be skipped
      if (showServerLink && !order.playerReady && !order.skippedAt) {
        const frontTime = order.reachedFrontAt || order.createdAt
        const deadline = new Date(new Date(frontTime).getTime() + SKIP_TIMEOUT_MS)
        skipDeadline = deadline.toISOString()
      }
    } else if (order.status === 'processing') {
      queuePosition = 0
      estimatedMinutes = ESTIMATED_MINUTES_PER_ORDER
      showServerLink = true
    }

    // Only include server link URL when gated
    const serverLink = showServerLink ? (process.env.PRIVATE_SERVER_URL || null) : null
    const serverLinkMobile = showServerLink ? (process.env.PRIVATE_SERVER_URL_MOBILE || null) : null

    return NextResponse.json({
      order,
      queuePosition,
      estimatedMinutes,
      totalInQueue,
      showServerLink,
      skipDeadline,
      serverLink,
      serverLinkMobile,
    })
  } catch (error) {
    console.error('Order status error:', error)
    return NextResponse.json({ error: 'Failed to get order status' }, { status: 500 })
  }
}
