import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import {
  getUser,
  getWalletBalance,
  addToWallet,
  deductFromWallet,
  updateWalletBalance,
  createLedgerEntry,
} from '@/lib/storage'
import { notifyAdminBalanceAdjust } from '@/lib/discord-webhook'

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
  const { amount, action, reason } = body

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || !['add', 'remove', 'set'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request. Amount must be a non-negative number.' }, { status: 400 })
  }

  const user = await getUser(id)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const before = await getWalletBalance(id)
  let updated: { walletBalance: number } | null = null
  let delta = 0

  if (action === 'add') {
    updated = await addToWallet(id, amount)
    if (!updated) {
      return NextResponse.json({ error: 'Add failed (wallet cap reached or db error).' }, { status: 400 })
    }
    delta = amount
  } else if (action === 'remove') {
    updated = await deductFromWallet(id, amount)
    if (!updated) {
      return NextResponse.json({
        error: `Insufficient balance. User has $${before.toFixed(2)}, cannot remove $${amount.toFixed(2)}.`,
        currentBalance: before,
      }, { status: 400 })
    }
    delta = -amount
  } else {
    // set
    updated = await updateWalletBalance(id, amount)
    if (!updated) {
      return NextResponse.json({ error: 'Set failed (amount out of range or db error).' }, { status: 400 })
    }
    delta = amount - before
  }

  await createLedgerEntry({
    type: 'admin_adjust',
    userId: id,
    amount: delta,
    description: `admin=${currentUser.name}(${currentUser.id}) action=${action} amount=$${amount.toFixed(2)} ${before.toFixed(2)}→${updated.walletBalance.toFixed(2)}${reason ? ` reason=${String(reason).slice(0, 200)}` : ''}`,
  })

  console.log(`[AUDIT] Admin ${currentUser.name} (${currentUser.id}) ${action} $${amount} on user ${user.name} (${id}): $${before} → $${updated.walletBalance}`)

  notifyAdminBalanceAdjust({
    adminName: currentUser.name,
    userName: user.name,
    userId: id,
    action: action as 'add' | 'remove' | 'set',
    amount,
    beforeBalance: before,
    afterBalance: updated.walletBalance,
    reason: typeof reason === 'string' ? reason : undefined,
  }).catch(err => console.error('[AdminBalance] Webhook failed:', err))

  const response = NextResponse.json({
    success: true,
    newBalance: updated.walletBalance,
    previousBalance: before,
    delta,
  })
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}
