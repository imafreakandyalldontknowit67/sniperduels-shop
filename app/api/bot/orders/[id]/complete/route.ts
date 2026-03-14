import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrder, updateOrder } from '@/lib/storage'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const order = await getOrder(id)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'pending' && order.status !== 'processing') {
    return NextResponse.json(
      { error: `Order is already ${order.status}` },
      { status: 400 }
    )
  }

  const updated = await updateOrder(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  })

  // Verify our write stuck (cancel may have raced us)
  const confirmed = await getOrder(id)
  if (confirmed && confirmed.status !== 'completed') {
    return NextResponse.json(
      { error: 'Order was cancelled before completion could finalize' },
      { status: 409 }
    )
  }

  return NextResponse.json({ order: updated })
}
