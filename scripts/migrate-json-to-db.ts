/**
 * Migrate JSON file data to PostgreSQL via Prisma.
 *
 * Usage:  npx tsx scripts/migrate-json-to-db.ts
 *
 * Safe to re-run — uses upsert with empty update:{} for idempotency.
 */

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient, Prisma } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
const DATA_DIR = path.join(process.cwd(), 'data')

function readJson<T>(filename: string, fallback: T): T {
  const fp = path.join(DATA_DIR, filename)
  if (!fs.existsSync(fp)) return fallback
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8'))
  } catch {
    return fallback
  }
}

/** Round a number to 2 decimal places to fix floating-point drift */
function dec2(n: unknown): Prisma.Decimal {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0
  return new Prisma.Decimal(v.toFixed(2))
}

async function main() {
  console.log('Starting JSON → PostgreSQL migration...\n')

  // ── 1. Users (must be first — orders & deposits FK to users) ──────────────
  const users = readJson<any[]>('users.json', [])
  console.log(`Migrating ${users.length} users...`)
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        name: u.name,
        displayName: u.displayName,
        avatar: u.avatar ?? null,
        robloxCreatedAt: u.robloxCreatedAt ?? null,
        discordId: u.discordId ?? null,
        discordUsername: u.discordUsername ?? null,
        discordAvatar: u.discordAvatar ?? null,
        discordLinkedAt: u.discordLinkedAt ?? null,
        walletBalance: dec2(u.walletBalance),
        lifetimeSpend: dec2(u.lifetimeSpend),
        discordFirstPurchaseUsed: u.discordFirstPurchaseUsed ?? false,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        isAdmin: u.isAdmin ?? false,
      },
      update: {},
    })
  }
  console.log('  Users done.\n')

  // ── 2. Orders ─────────────────────────────────────────────────────────────
  const orders = readJson<any[]>('orders.json', [])
  console.log(`Migrating ${orders.length} orders...`)
  for (const o of orders) {
    // Coerce quantity to integer (some test data has non-int values)
    const quantity = typeof o.quantity === 'number' ? Math.round(o.quantity) : parseInt(String(o.quantity)) || 1

    await prisma.order.upsert({
      where: { id: o.id },
      create: {
        id: o.id,
        userId: o.userId,
        userName: o.userName,
        type: o.type as any,
        itemName: o.itemName,
        quantity,
        pricePerUnit: dec2(o.pricePerUnit),
        totalPrice: dec2(o.totalPrice),
        status: o.status as any,
        playerReady: o.playerReady ?? false,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        completedAt: o.completedAt ?? null,
        notes: o.notes ?? null,
      },
      update: {},
    })
  }
  console.log('  Orders done.\n')

  // ── 3. Deposits ───────────────────────────────────────────────────────────
  const deposits = readJson<any[]>('deposits.json', [])
  console.log(`Migrating ${deposits.length} deposits...`)
  for (const d of deposits) {
    await prisma.deposit.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        userId: d.userId,
        amount: dec2(d.amount),
        status: d.status as any,
        pandabaseInvoiceId: d.pandabaseInvoiceId,
        pandabaseCheckoutUrl: d.pandabaseCheckoutUrl,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        completedAt: d.completedAt ?? null,
      },
      update: {},
    })
  }
  console.log('  Deposits done.\n')

  // ── 4. Stock Items ────────────────────────────────────────────────────────
  const stock = readJson<any[]>('stock.json', [])
  console.log(`Migrating ${stock.length} stock items...`)
  for (const s of stock) {
    await prisma.stockItem.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        name: s.name,
        type: s.type,
        description: s.description ?? null,
        priceUsd: dec2(s.priceUsd),
        stock: s.stock ?? 0,
        imageUrl: s.imageUrl ?? null,
        rarity: s.rarity ?? null,
        fx: s.fx ?? null,
        fragtrak: s.fragtrak ?? null,
        active: s.active ?? true,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      },
      update: {},
    })
  }
  console.log('  Stock items done.\n')

  // ── 5. Gem Stock (singleton) ──────────────────────────────────────────────
  interface GemStockData { balanceInK: number; updatedAt: string }
  const gemStock = readJson<GemStockData>('gem-stock.json', { balanceInK: 0, updatedAt: new Date().toISOString() })
  console.log(`Migrating gem stock (${gemStock.balanceInK}k)...`)
  await prisma.gemStock.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', balanceInK: gemStock.balanceInK, updatedAt: gemStock.updatedAt },
    update: {},
  })
  console.log('  Gem stock done.\n')

  // ── 6. Session Blacklist ──────────────────────────────────────────────────
  const blacklist = readJson<Record<string, number>>('session-blacklist.json', {})
  const now = Math.floor(Date.now() / 1000)
  const validEntries = Object.entries(blacklist).filter(([, exp]) => exp > now)
  console.log(`Migrating ${validEntries.length} non-expired session blacklist entries...`)
  for (const [jti, expiresAt] of validEntries) {
    await prisma.sessionBlacklist.upsert({
      where: { jti },
      create: { jti, expiresAt },
      update: {},
    })
  }
  console.log('  Session blacklist done.\n')

  console.log('Migration complete!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
