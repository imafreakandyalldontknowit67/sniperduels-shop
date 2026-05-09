import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateWalletBalance } from '@/lib/storage'

const TOL = 0.01
const round = (n: number) => Math.round(n * 100) / 100

interface Row {
  userId: string
  name: string
  isVendor: boolean
  walletBalance: number
  netEarnings: number
  deposits: number
  refunds: number
  referralCommissions: number
  adminAdjust: number
  purchases: number
  completedPayouts: number
  pendingPayouts: number
  expected: number
  actual: number
  delta: number
  vendorEarningCount: number
  lastActivityAt: string | null
}

async function compute(): Promise<Row[]> {
  const [users, earningsByUser, ledgerByUserType, payoutsByUser] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, isVendor: true, walletBalance: true } }),
    prisma.vendorEarning.groupBy({
      by: ['vendorId'],
      _sum: { netAmount: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.transactionLedger.groupBy({
      by: ['userId', 'type'],
      _sum: { amount: true },
    }),
    prisma.vendorPayout.groupBy({
      by: ['vendorId', 'status'],
      _sum: { amount: true },
    }),
  ])

  const earningsMap = new Map(earningsByUser.map(e => [e.vendorId, e]))
  const ledgerMap = new Map<string, Map<string, number>>()
  for (const r of ledgerByUserType) {
    if (!ledgerMap.has(r.userId)) ledgerMap.set(r.userId, new Map())
    ledgerMap.get(r.userId)!.set(r.type, Number(r._sum.amount ?? 0))
  }
  const payoutsMap = new Map<string, Map<string, number>>()
  for (const r of payoutsByUser) {
    if (!payoutsMap.has(r.vendorId)) payoutsMap.set(r.vendorId, new Map())
    payoutsMap.get(r.vendorId)!.set(r.status, Number(r._sum.amount ?? 0))
  }

  const rows: Row[] = []
  for (const u of users) {
    const wallet = Number(u.walletBalance)
    const earnings = earningsMap.get(u.id)
    const ledger = ledgerMap.get(u.id) ?? new Map<string, number>()
    const payouts = payoutsMap.get(u.id) ?? new Map<string, number>()

    const netEarnings = Number(earnings?._sum.netAmount ?? 0)
    const deposits = ledger.get('deposit') ?? 0
    const refunds = ledger.get('refund') ?? 0
    const referralCommissions = ledger.get('referral_commission') ?? 0
    const adminAdjust = ledger.get('admin_adjust') ?? 0 // signed (+ add, - remove)
    const purchases = ledger.get('purchase') ?? 0
    const completedPayouts = payouts.get('completed') ?? 0
    const pendingPayouts = payouts.get('pending') ?? 0

    const expected = round(netEarnings + deposits + refunds + referralCommissions + adminAdjust - purchases - completedPayouts - pendingPayouts)
    const actual = round(wallet)
    const delta = round(actual - expected)

    const hasActivity = wallet !== 0 || earnings || ledger.size > 0 || payouts.size > 0
    if (!hasActivity) continue

    rows.push({
      userId: u.id,
      name: u.name,
      isVendor: u.isVendor,
      walletBalance: wallet,
      netEarnings,
      deposits,
      refunds,
      referralCommissions,
      adminAdjust,
      purchases,
      completedPayouts,
      pendingPayouts,
      expected,
      actual,
      delta,
      vendorEarningCount: Number(earnings?._count._all ?? 0),
      lastActivityAt: earnings?._max.createdAt ?? null,
    })
  }

  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

export async function GET() {
  const me = await getCurrentUser()
  if (!me || !isAdmin(me.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await compute()
  const mismatches = rows.filter(r => Math.abs(r.delta) >= TOL)
  return NextResponse.json({
    summary: {
      totalUsers: rows.length,
      mismatchCount: mismatches.length,
      totalAbsDelta: round(mismatches.reduce((s, r) => s + Math.abs(r.delta), 0)),
      totalSignedDelta: round(rows.reduce((s, r) => s + r.delta, 0)),
    },
    rows,
    generatedAt: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  const me = await getCurrentUser()
  if (!me || !isAdmin(me.id)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { userId, action, reason } = body || {}
  if (!userId || typeof userId !== 'string') return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (action !== 'fix') return NextResponse.json({ error: 'action must be "fix"' }, { status: 400 })
  if (typeof reason !== 'string' || reason.trim().length < 5) {
    return NextResponse.json({ error: 'reason required (min 5 chars)' }, { status: 400 })
  }

  const rows = await compute()
  const target = rows.find(r => r.userId === userId)
  if (!target) return NextResponse.json({ error: 'User has no activity to reconcile' }, { status: 404 })
  if (Math.abs(target.delta) < TOL) return NextResponse.json({ error: 'No mismatch — wallet already matches expected' }, { status: 400 })

  // Set wallet to expected, write admin_adjust ledger row in same TX (via helper)
  const updated = await updateWalletBalance(userId, target.expected, {
    type: 'admin_adjust',
    description: `Reconcile fix by ${me.name}(${me.id}): ${target.actual.toFixed(2)}→${target.expected.toFixed(2)} (delta ${target.delta.toFixed(2)}) reason=${reason.trim().slice(0, 200)}`,
  })
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  console.log(`[RECONCILE-FIX] ${me.name}(${me.id}) reconciled ${target.name}(${userId}): ${target.actual.toFixed(2)} → ${target.expected.toFixed(2)} reason=${reason}`)

  return NextResponse.json({ success: true, userId, previous: target.actual, current: target.expected, delta: target.delta })
}
