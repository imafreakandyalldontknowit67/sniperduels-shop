import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { updateWalletBalance, getUser } from '@/lib/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()

  if (!currentUser || !isAdmin(currentUser.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { amount, action } = body

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || !['add', 'remove', 'set'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request. Amount must be a non-negative number.' }, { status: 400 })
  }

  const user = await getUser(id)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let newBalance: number
  const currentBalance = user.walletBalance || 0

  switch (action) {
    case 'add':
      newBalance = currentBalance + amount
      break
    case 'remove':
      newBalance = Math.max(0, currentBalance - amount)
      break
    case 'set':
      newBalance = Math.max(0, amount)
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const updatedUser = await updateWalletBalance(id, newBalance)

  if (!updatedUser) {
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
  }

  const response = NextResponse.json({
    success: true,
    newBalance: updatedUser.walletBalance
  })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}
