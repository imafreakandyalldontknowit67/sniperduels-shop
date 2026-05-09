import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import {
  getUser,
  getWalletBalance,
  getVendorEarnings,
  getVendorEarningsSummary,
  getVendorPayouts,
  getLedgerEntries,
} from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser || !isAdmin(currentUser.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const user = await getUser(id)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const [balance, earnings, earningsSummary, payouts, ledger, purchaseAgg, refundAgg] = await Promise.all([
    getWalletBalance(id),
    getVendorEarnings(id),
    getVendorEarningsSummary(id),
    getVendorPayouts(id),
    getLedgerEntries({ userId: id, limit: 100 }),
    prisma.transactionLedger.aggregate({ where: { userId: id, type: 'purchase' }, _sum: { amount: true } }),
    prisma.transactionLedger.aggregate({ where: { userId: id, type: 'refund' }, _sum: { amount: true } }),
  ])

  const purchases = Number(purchaseAgg._sum.amount ?? 0)
  const refunds = Number(refundAgg._sum.amount ?? 0)

  const completedPayouts = payouts
    .filter(p => p.status === 'completed')
    .reduce((s, p) => s + Number(p.amount), 0)
  const pendingPayouts = payouts
    .filter(p => p.status === 'pending')
    .reduce((s, p) => s + Number(p.amount), 0)

  // Reconciliation: net earnings + refunds - purchases - completed payouts - pending payouts (locked)
  const expected = Math.round((earningsSummary.totalNet + refunds - purchases - completedPayouts - pendingPayouts) * 100) / 100
  const actual = Math.round(balance * 100) / 100
  const delta = Math.round((actual - expected) * 100) / 100

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      avatar: user.avatar,
      isVendor: user.isVendor,
      discordUsername: user.discordUsername,
    },
    balance,
    earningsSummary,
    earnings: earnings.slice(0, 100),
    payouts,
    purchases,
    refunds,
    reconciliation: {
      expected,
      actual,
      delta,
      ok: Math.abs(delta) < 0.01,
      breakdown: {
        netEarnings: earningsSummary.totalNet,
        refunds,
        purchases,
        completedPayouts,
        pendingPayouts,
      },
    },
    ledger,
  })
}
