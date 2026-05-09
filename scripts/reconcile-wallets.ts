/**
 * Reconcile every user's walletBalance against the ledger + earnings + payouts.
 *
 * Usage:  npx tsx scripts/reconcile-wallets.ts [--csv path/to.csv] [--quiet]
 *
 * For every user with vendor activity OR a non-zero wallet:
 *   expected = sum(VendorEarning.netAmount)
 *            + sum(ledger where type='deposit')
 *            + sum(ledger where type='refund')
 *            + sum(ledger where type='referral_commission')
 *            - sum(ledger where type='purchase')
 *            - sum(VendorPayout.amount where status in ('completed','pending'))
 *
 * Writes a CSV next to the script and pings Discord if any |delta| > $1.
 * Exits 0 on full match, 1 on any mismatch.
 */

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

type Row = {
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

const TOL = 0.01

async function main() {
  const args = new Set(process.argv.slice(2))
  const quiet = args.has('--quiet')
  const csvIdx = process.argv.indexOf('--csv')
  const csvPath = csvIdx >= 0 ? process.argv[csvIdx + 1] : path.join('scripts', `_reconcile_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`)

  console.log(`[reconcile] start ${new Date().toISOString()}`)

  // Pull aggregates
  const [users, earningsByUser, ledgerByUserType, payoutsByUser] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, isVendor: true, walletBalance: true },
    }),
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
    const ledger = ledgerMap.get(u.id) ?? new Map()
    const payouts = payoutsMap.get(u.id) ?? new Map()

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

    // Skip dormant accounts with zero wallet AND zero activity to keep output tight
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

  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const mismatches = rows.filter(r => Math.abs(r.delta) >= TOL)
  const totalDelta = round(rows.reduce((s, r) => s + r.delta, 0))

  // CSV
  const csvHeader = 'userId,name,isVendor,wallet,netEarnings,deposits,refunds,referralCommissions,adminAdjust,purchases,completedPayouts,pendingPayouts,expected,actual,delta,vendorEarningCount,lastActivityAt\n'
  const csvBody = rows.map(r => [
    r.userId, esc(r.name), r.isVendor, r.walletBalance, r.netEarnings, r.deposits, r.refunds,
    r.referralCommissions, r.adminAdjust, r.purchases, r.completedPayouts, r.pendingPayouts,
    r.expected, r.actual, r.delta, r.vendorEarningCount, r.lastActivityAt ?? ''
  ].join(',')).join('\n')
  fs.mkdirSync(path.dirname(csvPath), { recursive: true })
  fs.writeFileSync(csvPath, csvHeader + csvBody + '\n', 'utf-8')

  // Console
  if (!quiet) {
    console.log(`\n[reconcile] ${rows.length} active users scanned, ${mismatches.length} mismatches, total delta $${totalDelta.toFixed(2)}`)
    if (mismatches.length) {
      console.log('\nMismatches (top 30 by |delta|):')
      console.log('userId               name                 expected      actual        delta')
      console.log('-'.repeat(90))
      for (const r of mismatches.slice(0, 30)) {
        console.log(
          `${r.userId.padEnd(20)} ${r.name.slice(0, 20).padEnd(20)} $${r.expected.toFixed(2).padStart(11)} $${r.actual.toFixed(2).padStart(11)} $${r.delta.toFixed(2).padStart(10)}`
        )
      }
    }
    console.log(`\n[reconcile] CSV written to ${csvPath}`)
  }

  // Discord ping if mismatches
  if (mismatches.length && process.env.DISCORD_WEBHOOK_URL) {
    const top = mismatches.slice(0, 10)
      .map(r => `\`${r.userId}\` ${r.name}: expected $${r.expected.toFixed(2)}, actual $${r.actual.toFixed(2)}, delta $${r.delta.toFixed(2)}`)
      .join('\n')
    const body = {
      embeds: [{
        title: '⚠️ Wallet Reconciliation Mismatch',
        color: 0xe67e22,
        fields: [
          { name: 'Mismatches', value: String(mismatches.length), inline: true },
          { name: 'Total |Δ|', value: `$${round(mismatches.reduce((s, r) => s + Math.abs(r.delta), 0)).toFixed(2)}`, inline: true },
          { name: 'Top 10', value: top.slice(0, 1024) || 'none', inline: false },
        ],
        timestamp: new Date().toISOString(),
      }],
    }
    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err) {
      console.error('[reconcile] Discord webhook failed:', err)
    }
  }

  process.exit(mismatches.length ? 1 : 0)
}

function round(n: number) { return Math.round(n * 100) / 100 }
function esc(s: string) { return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

main().catch(err => {
  console.error('[reconcile] fatal:', err)
  process.exit(2)
})
