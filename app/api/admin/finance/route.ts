import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getLedgerEntries } from '@/lib/storage'
import { getPandabaseAnalytics, getPandabasePayouts, getPandabaseGrossVolume, type PBPeriod } from '@/lib/pandabase-api'
import { getCryptoPayments, summarizeCryptoPayments } from '@/lib/nearpayments-api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const periodMap: Record<string, PBPeriod> = {
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  all: 'all',
  week: '7d',
  month: '30d',
}

function getPSTSince(period: string): string | undefined {
  const now = new Date()
  if (period === 'all') return undefined

  if (period === 'today') {
    // Calculate PST midnight in UTC
    const pst = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now)
    const y = +pst.find(p => p.type === 'year')!.value
    const m = +pst.find(p => p.type === 'month')!.value - 1
    const d = +pst.find(p => p.type === 'day')!.value
    const pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    const utcOffset = now.getTime() - pstNow.getTime()
    return new Date(new Date(y, m, d).getTime() + utcOffset).toISOString()
  }

  const days = period === '7d' || period === 'week' ? 7
    : period === '30d' || period === 'month' ? 30
    : period === '90d' ? 90 : 0
  if (days > 0) return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
  return undefined
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const pbPeriod = periodMap[period] || 'all'
    const since = getPSTSince(period)

    // Parallel fetch: Pandabase analytics, payouts, gross volume, crypto, vendor data, ledger
    const [
      pbAnalytics,
      pbPayouts,
      pbDailyRevenue,
      cryptoPayments,
      vendorData,
      pendingPayouts,
      recentTransactions,
    ] = await Promise.all([
      getPandabaseAnalytics(pbPeriod).catch(err => {
        console.error('Pandabase analytics error:', err)
        return null
      }),
      getPandabasePayouts().catch(() => []),
      getPandabaseGrossVolume(pbPeriod === 'all' ? '90d' : pbPeriod).catch(() => []),
      getCryptoPayments().catch(() => []),
      // Vendor earnings from our DB
      (async () => {
        const where: any = {}
        if (since) where.createdAt = { gte: since }
        const [earnings, vendorBalances] = await Promise.all([
          prisma.vendorEarning.aggregate({
            where,
            _sum: { platformFee: true, netAmount: true },
          }),
          prisma.user.aggregate({
            where: { isVendor: true },
            _sum: { walletBalance: true },
          }),
        ])
        return {
          platformFees: Number(earnings._sum.platformFee ?? 0),
          vendorEarnings: Number(earnings._sum.netAmount ?? 0),
          vendorBalancesOwed: Number(vendorBalances._sum.walletBalance ?? 0),
        }
      })(),
      prisma.vendorPayout.count({ where: { status: 'pending' } }),
      getLedgerEntries({ limit: 30 }),
    ])

    // Crypto summary (filter by period if needed)
    let filteredCrypto = cryptoPayments
    if (since) {
      filteredCrypto = cryptoPayments.filter(p => new Date(p.created_at) >= new Date(since))
    }
    const crypto = summarizeCryptoPayments(filteredCrypto)

    // Build response
    const pandabase = pbAnalytics ? {
      gross: pbAnalytics.revenue.gross / 100,
      net: pbAnalytics.revenue.net / 100,
      fees: pbAnalytics.revenue.fees / 100,
      refunded: pbAnalytics.revenue.refunded / 100,
      completedOrders: pbAnalytics.orders.completed,
      pendingOrders: pbAnalytics.orders.pending,
      totalOrders: pbAnalytics.orders.total,
      refundedOrders: pbAnalytics.orders.refunded,
      avgOrderValue: pbAnalytics.averageOrderValue / 100,
    } : null

    const payoutsSummary = {
      items: pbPayouts.map(p => ({
        id: p.id,
        amount: p.amount / 100,
        fee: p.fee / 100,
        status: p.status,
        date: p.createdAt,
      })),
      totalCompleted: pbPayouts
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount / 100, 0),
      totalPending: pbPayouts
        .filter(p => p.status !== 'COMPLETED')
        .reduce((sum, p) => sum + p.amount / 100, 0),
      totalFees: pbPayouts.reduce((sum, p) => sum + p.fee / 100, 0),
    }

    const combined = {
      totalFiatRevenue: pandabase?.gross ?? 0,
      totalCryptoRevenue: crypto.totalDeposited,
      totalRevenue: (pandabase?.gross ?? 0) + crypto.totalDeposited,
      pandabaseFees: pandabase?.fees ?? 0,
      netAfterFees: (pandabase?.net ?? 0) + crypto.totalDeposited,
      vendorPlatformFees: vendorData.platformFees,
    }

    return NextResponse.json({
      pandabase,
      crypto: {
        totalDeposited: crypto.totalDeposited,
        completedCount: crypto.completedCount,
        payments: crypto.payments.slice(0, 20).map(p => ({
          id: p.payment_id,
          amount: p.price_amount,
          currency: p.pay_currency,
          status: p.payment_status,
          date: p.created_at,
        })),
      },
      combined,
      vendors: {
        earnings: vendorData.vendorEarnings,
        platformFees: vendorData.platformFees,
        balancesOwed: vendorData.vendorBalancesOwed,
        pendingPayoutCount: pendingPayouts,
      },
      payouts: payoutsSummary,
      dailyRevenue: pbDailyRevenue.map(d => ({
        date: d.date,
        revenue: d.revenue / 100,
        orders: d.orders,
      })),
      recentTransactions,
    })
  } catch (error) {
    console.error('Finance stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch finance stats' }, { status: 500 })
  }
}
