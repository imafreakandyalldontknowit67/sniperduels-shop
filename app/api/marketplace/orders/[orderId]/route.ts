/**
 * Order tracking endpoint — used by the buyer's tracking page poll.
 * Returns Order + DeliveryJob status (no PII from seller side).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId } = await params
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.type !== 'item') {
    return NextResponse.json({ error: 'Not an item order' }, { status: 400 })
  }

  const delivery = await prisma.itemDeliveryJob.findUnique({
    where: { orderId },
    include: {
      vaultItem: {
        include: { catalog: { select: { name: true, type: true } } },
      },
    },
  })

  return NextResponse.json(
    {
      order: {
        id: order.id,
        status: order.status,
        itemName: order.itemName,
        totalPrice: String(order.totalPrice),
        createdAt: order.createdAt,
      },
      delivery: delivery
        ? {
            id: delivery.id,
            status: delivery.status,
            attempts: delivery.attempts,
            lastError: delivery.lastError,
            startedAt: delivery.startedAt,
            completedAt: delivery.completedAt,
          }
        : null,
      vaultItem: delivery?.vaultItem
        ? { catalog: delivery.vaultItem.catalog }
        : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
