import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrder, getOrders } from '@/lib/storage'

const ESTIMATED_MINUTES_PER_ORDER = 2

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

    if (order.status === 'pending') {
      // Count pending orders created before this one (the queue ahead)
      const allOrders = await getOrders()
      const pendingAhead = allOrders.filter(
        o => o.status === 'pending' && o.createdAt < order.createdAt
      )
      // Also check if any order is currently processing (bot is busy)
      const processingCount = allOrders.filter(o => o.status === 'processing').length

      queuePosition = pendingAhead.length + processingCount + 1
      totalInQueue = allOrders.filter(o => o.status === 'pending').length
      estimatedMinutes = queuePosition * ESTIMATED_MINUTES_PER_ORDER
    } else if (order.status === 'processing') {
      queuePosition = 0
      estimatedMinutes = ESTIMATED_MINUTES_PER_ORDER
    }

    return NextResponse.json({
      order,
      queuePosition,
      estimatedMinutes,
      totalInQueue,
    })
  } catch (error) {
    console.error('Order status error:', error)
    return NextResponse.json({ error: 'Failed to get order status' }, { status: 500 })
  }
}
