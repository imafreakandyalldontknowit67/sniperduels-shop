import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { getLedgerEntries } from '@/lib/storage'
import { getPandabaseAnalytics, getPandabasePayouts, getPandabaseGrossVolume, type PBPeriod } from '@/lib/pandabase-api'
import { getCryptoPayments, summarizeCryptoPayments } from '@/lib/nearpayments-api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Decimal = { toNumber?: () => number } | number | null
function d(v: Decimal): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'object' && 'toNumber' in v && v.toNumber) return v.toNumber()
  return Number(v)
}

const periodMap: Record<string, PBPeriod> = {
  '7d': '7d', '30d': '30d', '90d': '90d', all: 'all',
  week: '7d', month: '30d',
}

function getPSTSince(period: string): string | undefined {
  const now = new Date()
  if (period === 'all') return undefined
  if (period === 'today') {
    const pst = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now)
    const y = +pst.find(p => p.type === 'year')!.value
    const m = +pst.find(p => p.type === 'month')!.value - 1
    const dd = +pst.find(p => p.type === 'day')!.value
    const pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    const utcOffset = now.getTime() - pstNow.getTime()
    return new Date(new Date(y, m, dd).getTime() + utcOffset).toISOString()
  }
  const days = period === '7d' || period === 'week' ? 7
    : period === '30d' || period === 'month' ? 30
    : period === '90d' ? 90 : 0
  if (days > 0) return new Date(now.getTime() - days * 86400000).toISOString()
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

    const depositWhere: any = { status: 'completed' }
    const orderWhere: any = { status: 'completed' }
    const earningWhere: any = {}
    if (since) {
      depositWhere.completedAt = { gte: since }
      orderWhere.createdAt = { gte: since }
      earningWhere.createdAt = { gte: since }
    }

    const [
      pbAnalytics,
      pbPayouts,
      pbDailyRevenue,
      cryptoPayments,
      // Our DB data
      depositAgg,
      platformOrders,
      vendorEarningAgg,
      vendorBalances,
      pendingPayoutCount,
      recentTransactions,
    ] = await Promise.all([
      getPandabaseAnalytics(pbPeriod).catch(err => { console.error('PB analytics:', err); return null }),
      getPandabasePayouts().catch(() => []),
      getPandabaseGrossVolume(pbPeriod === 'all' ? '90d' : pbPeriod).catch(() => []),
      getCryptoPayments().catch(() => []),
      // Sum deposits from our DB (what users actually deposited + processing fees)
      prisma.deposit.aggregate({
        where: depositWhere,
        _sum: { amount: true, processingFee: true, chargeAmount: true },
        _count: true,
      }),
      // Platform orders (NOT vendor) — these are our own stock sales
      prisma.order.aggregate({
        where: { ...orderWhere, vendorListingId: null },
        _sum: { totalPrice: true },
        _count: true,
      }),
      // Vendor earnings (we get platformFee, vendor gets netAmount)
      prisma.vendorEarning.aggregate({
        where: earningWhere,
        _sum: { platformFee: true, netAmount: true, saleAmount: true },
        _count: true,
      }),
      prisma.user.aggregate({
        where: { isVendor: true },
        _sum: { walletBalance: true },
      }),
      prisma.vendorPayout.count({ where: { status: 'pending' } }),
      getLedgerEntries({ limit: 30 }),
    ])

    // === DEPOSIT PROFIT ===
    // Users deposit $X, we charge them $X + processing fee (7% + $0.35)
    // Pandabase takes 5.9% + $0.30 from the charge amount
    // Our profit = processing fee collected - pandabase fees
    const totalUserDeposits = d(depositAgg._sum.amount) // what goes to user wallets
    const totalProcessingFees = d(depositAgg._sum.processingFee) // our markup
    const totalChargeAmount = d(depositAgg._sum.chargeAmount) // total charged to user
    const pandabaseFees = pbAnalytics ? pbAnalytics.revenue.fees / 100 : 0
    const depositProfit = Math.round((totalProcessingFees - pandabaseFees) * 100) / 100

    // === CRYPTO DEPOSITS ===
    // No fees on crypto — but these are user wallet deposits, not profit
    // Crypto deposits go to user wallets, user spends on gems/items
    let filteredCrypto = cryptoPayments
    if (since) filteredCrypto = cryptoPayments.filter(p => new Date(p.created_at) >= new Date(since))
    const crypto = summarizeCryptoPayments(filteredCrypto)

    // === PLATFORM SALES PROFIT ===
    // When WE sell gems (not vendor), profit = sale price - cost
    // Cost: $2.35/k (fiat supply), gems are sold at $2.90/k (or $2.65/k bulk)
    // For items: we buy items and resell, margin varies
    // Simple approach: we know totalPrice from platform orders
    // Gem cost ratio ≈ $2.35/$2.90 ≈ 81% cost, so ~19% margin on standard
    // But we don't track cost per order in DB, so use the platform order revenue
    // and note it includes COGS
    const platformSalesRevenue = d(platformOrders._sum.totalPrice)
    const platformOrderCount = platformOrders._count

    // === VENDOR PLATFORM FEES ===
    // We take 3% of vendor sales — this IS pure profit
    const vendorPlatformFees = d(vendorEarningAgg._sum.platformFee)
    const vendorSaleTotal = d(vendorEarningAgg._sum.saleAmount)
    const vendorNetToVendors = d(vendorEarningAgg._sum.netAmount)
    const vendorSaleCount = vendorEarningAgg._count
    const vendorBalancesOwed = d(vendorBalances._sum.walletBalance)

    // === TOTAL PROFIT BREAKDOWN ===
    const profitBreakdown = {
      depositProfit, // processing fee markup minus pandabase fees
      vendorPlatformFees, // 3% of vendor sales (pure profit)
      platformSalesRevenue, // revenue from our own sales (includes COGS)
      // Note: platformSalesRevenue isn't pure profit — it includes cost of gems
    }

    // Pandabase payouts (to bank)
    const payoutsSummary = {
      items: pbPayouts.map(p => ({
        id: p.id, amount: p.amount / 100, fee: p.fee / 100,
        status: p.status, date: p.createdAt,
      })),
      totalCompleted: pbPayouts.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount / 100, 0),
      totalPending: pbPayouts.filter(p => p.status !== 'COMPLETED').reduce((s, p) => s + p.amount / 100, 0),
      totalFees: pbPayouts.reduce((s, p) => s + p.fee / 100, 0),
    }

    return NextResponse.json({
      deposits: {
        totalUserDeposits: Math.round(totalUserDeposits * 100) / 100,
        totalProcessingFees: Math.round(totalProcessingFees * 100) / 100,
        totalChargeAmount: Math.round(totalChargeAmount * 100) / 100,
        pandabaseFees: Math.round(pandabaseFees * 100) / 100,
        depositProfit,
        count: depositAgg._count,
      },
      crypto: {
        totalDeposited: crypto.totalDeposited,
        completedCount: crypto.completedCount,
        payments: crypto.payments.slice(0, 20).map(p => ({
          id: p.payment_id, amount: p.price_amount, currency: p.pay_currency,
          status: p.payment_status, date: p.created_at,
        })),
      },
      platformSales: {
        revenue: Math.round(platformSalesRevenue * 100) / 100,
        orderCount: platformOrderCount,
      },
      vendorSales: {
        totalSales: Math.round(vendorSaleTotal * 100) / 100,
        platformFees: Math.round(vendorPlatformFees * 100) / 100,
        vendorEarnings: Math.round(vendorNetToVendors * 100) / 100,
        saleCount: vendorSaleCount,
        balancesOwed: Math.round(vendorBalancesOwed * 100) / 100,
        pendingPayoutCount,
      },
      profitSummary: {
        depositProfit,
        vendorPlatformFees: Math.round(vendorPlatformFees * 100) / 100,
        platformSalesRevenue: Math.round(platformSalesRevenue * 100) / 100,
        cryptoDeposits: crypto.totalDeposited, // goes to user wallets, not direct profit
      },
      payouts: payoutsSummary,
      dailyRevenue: pbDailyRevenue.map(dd => ({ date: dd.date, revenue: dd.revenue / 100, orders: dd.orders })),
      recentTransactions,
      pandabaseRaw: pbAnalytics ? {
        gross: pbAnalytics.revenue.gross / 100,
        net: pbAnalytics.revenue.net / 100,
        fees: pbAnalytics.revenue.fees / 100,
        refunded: pbAnalytics.revenue.refunded / 100,
        completedOrders: pbAnalytics.orders.completed,
        pendingOrders: pbAnalytics.orders.pending,
      } : null,
    })
  } catch (error) {
    console.error('Finance stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch finance stats' }, { status: 500 })
  }
}
