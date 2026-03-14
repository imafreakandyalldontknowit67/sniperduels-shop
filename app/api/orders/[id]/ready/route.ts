import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrder } from '@/lib/storage'
import { getSession } from '@/lib/auth'

// Cooldown: users can only mark ready once every 2 minutes per order
const readyCooldowns = new Map<string, number>()
const READY_COOLDOWN_MS = 2 * 60_000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (order.status !== 'pending' && order.status !== 'processing') {
    return NextResponse.json(
      { error: `Order is already ${order.status}` },
      { status: 400 }
    )
  }

  // Already marked ready
  if (order.playerReady) {
    return NextResponse.json(
      { error: 'Order is already marked as ready' },
      { status: 400 }
    )
  }

  // Cooldown check — prevent spamming ready on multiple orders
  const cooldownKey = `${session.user.id}:${id}`
  const lastReady = readyCooldowns.get(cooldownKey)
  if (lastReady && Date.now() - lastReady < READY_COOLDOWN_MS) {
    const waitSec = Math.ceil((READY_COOLDOWN_MS - (Date.now() - lastReady)) / 1000)
    return NextResponse.json(
      { error: `Please wait ${waitSec} seconds before marking ready again` },
      { status: 429 }
    )
  }

  // Require explicit confirmation in request body
  let body: { confirm?: boolean }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!body.confirm) {
    return NextResponse.json(
      { error: 'Must send { "confirm": true } to confirm you have joined the private server and enabled trades' },
      { status: 400 }
    )
  }

  readyCooldowns.set(cooldownKey, Date.now())

  const updated = await updateOrder(id, { playerReady: true })

  return NextResponse.json({ order: updated })
}
