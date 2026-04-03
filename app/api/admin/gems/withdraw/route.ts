import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { createOrder, getOrders, deductGemStock, getGemStock } from '@/lib/storage'
import { getBotLastHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allOrders = await getOrders()
  const withdrawals = allOrders
    .filter(o => o.notes?.startsWith('platform-withdraw'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)

  return NextResponse.json({ withdrawals })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lastHeartbeat = await getBotLastHeartbeat()
  if (Date.now() - lastHeartbeat > BOT_OFFLINE_THRESHOLD_MS) {
    return NextResponse.json(
      { error: 'The trade bot is currently offline. Please try again later.' },
      { status: 503 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { amountK } = body
  if (!amountK || typeof amountK !== 'number' || !Number.isInteger(amountK) || amountK < 1 || amountK > 10000) {
    return NextResponse.json({ error: 'amountK must be an integer between 1 and 10000' }, { status: 400 })
  }

  // Check stock
  const stock = await getGemStock()
  if (stock < amountK) {
    return NextResponse.json({ error: `Insufficient stock. Available: ${stock}k` }, { status: 400 })
  }

  // Check no pending platform withdrawal already
  const allOrders = await getOrders()
  const pending = allOrders.find(o => o.notes?.startsWith('platform-withdraw') && (o.status === 'pending' || o.status === 'processing'))
  if (pending) {
    return NextResponse.json({ error: 'A platform withdrawal is already pending. Wait for it to complete.' }, { status: 400 })
  }

  // Deduct stock immediately (refunded if order fails/expires)
  const deducted = await deductGemStock(amountK)
  if (!deducted) {
    return NextResponse.json({ error: 'Failed to deduct stock' }, { status: 500 })
  }

  const order = await createOrder({
    userId: user.id,
    userName: user.name,
    type: 'gems',
    itemName: `Platform Withdraw: ${amountK}k Gems`,
    quantity: amountK,
    pricePerUnit: 0,
    totalPrice: 0,
    status: 'pending',
    notes: 'platform-withdraw',
  })

  return NextResponse.json({ order })
}
