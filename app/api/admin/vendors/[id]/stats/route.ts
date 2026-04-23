import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getVendorEarnings, getVendorDeposits, getVendorListing, getOrders } from '@/lib/storage'

export const dynamic = 'force-dynamic'

function bucketByTime<T extends { createdAt: string }>(
  items: T[],
  todayStart: Date,
  weekAgo: Date,
  monthAgo: Date,
) {
  const today: T[] = []
  const week: T[] = []
  const month: T[] = []

  for (const item of items) {
    const d = new Date(item.createdAt)
    if (d >= todayStart) today.push(item)
    if (d >= weekAgo) week.push(item)
    if (d >= monthAgo) month.push(item)
  }

  return { today, week, month, all: items }
}

function summarizeEarnings(items: { saleAmount: number; platformFee: number; netAmount: number }[]) {
  return {
    count: items.length,
    gross: Math.round(items.reduce((s, e) => s + e.saleAmount, 0) * 100) / 100,
    fees: Math.round(items.reduce((s, e) => s + e.platformFee, 0) * 100) / 100,
    net: Math.round(items.reduce((s, e) => s + e.netAmount, 0) * 100) / 100,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendorId = params.id
  const now = new Date()
  // Use PST for "today" boundary
  const _pst = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const _pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const _utcOff = now.getTime() - _pstNow.getTime()
  const todayStart = new Date(new Date(
    +_pst.find(p => p.type === 'year')!.value,
    +_pst.find(p => p.type === 'month')!.value - 1,
    +_pst.find(p => p.type === 'day')!.value,
  ).getTime() + _utcOff)
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const monthAgo = new Date(now.getTime() - 30 * 86400000)

  try {
    const [earnings, deposits, listing, allOrders] = await Promise.all([
      getVendorEarnings(vendorId),
      getVendorDeposits(vendorId),
      getVendorListing(vendorId),
      getOrders(),
    ])

    // Sales bucketed by time
    const earningBuckets = bucketByTime(earnings, todayStart, weekAgo, monthAgo)
    const sales = {
      today: summarizeEarnings(earningBuckets.today),
      week: summarizeEarnings(earningBuckets.week),
      month: summarizeEarnings(earningBuckets.month),
      allTime: summarizeEarnings(earningBuckets.all),
    }

    // Stock deposits (completed only)
    const completedDeposits = deposits.filter(d => d.status === 'completed')
    const depositedLast7dK = completedDeposits
      .filter(d => new Date(d.createdAt) >= weekAgo)
      .reduce((s, d) => s + d.amountK, 0)
    const depositedLast30dK = completedDeposits
      .filter(d => new Date(d.createdAt) >= monthAgo)
      .reduce((s, d) => s + d.amountK, 0)
    const restockCount30d = completedDeposits
      .filter(d => new Date(d.createdAt) >= monthAgo).length

    // Gems sold — from completed orders with this vendor's listing
    const vendorSaleOrders = allOrders.filter(
      o => o.vendorListingId && o.status === 'completed' &&
        // Match by checking earnings exist for this vendor+order
        earnings.some(e => e.orderId === o.id)
    )
    const soldLast7dK = vendorSaleOrders
      .filter(o => new Date(o.createdAt) >= weekAgo)
      .reduce((s, o) => s + o.quantity, 0)
    const soldLast30dK = vendorSaleOrders
      .filter(o => new Date(o.createdAt) >= monthAgo)
      .reduce((s, o) => s + o.quantity, 0)

    // Withdrawals — orders with notes starting with vendor-withdrawal:{vendorId}
    const withdrawals = allOrders.filter(
      o => o.notes?.startsWith(`vendor-withdrawal:${vendorId}`) && o.status === 'completed'
    )
    const withdrawnLast7dK = withdrawals
      .filter(o => new Date(o.createdAt) >= weekAgo)
      .reduce((s, o) => s + o.quantity, 0)
    const withdrawnLast30dK = withdrawals
      .filter(o => new Date(o.createdAt) >= monthAgo)
      .reduce((s, o) => s + o.quantity, 0)

    // Estimated days of stock remaining
    const avgDailySoldK = soldLast7dK / 7
    const currentK = listing?.stockK ?? 0
    const estDaysRemaining = avgDailySoldK > 0
      ? Math.round(currentK / avgDailySoldK)
      : null

    return NextResponse.json({
      sales,
      stock: {
        currentK,
        active: listing?.active ?? false,
        depositedLast7dK,
        depositedLast30dK,
        soldLast7dK,
        soldLast30dK,
        withdrawnLast7dK,
        withdrawnLast30dK,
        restockCount30d,
        estDaysRemaining,
      },
    })
  } catch (error) {
    console.error('Vendor stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch vendor stats' }, { status: 500 })
  }
}
