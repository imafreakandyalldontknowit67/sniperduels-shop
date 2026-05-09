import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Tests run against TEST_DATABASE_URL (separate DB from dev/prod).
// Set it in .env.local: TEST_DATABASE_URL="postgresql://user:pw@localhost:5432/sniper_duels_test"
//
// Setup once: createdb sniper_duels_test && DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
// (Trigger from 20260509000000_enforce_wallet_ledger applies automatically.)
//
// If TEST_DATABASE_URL is missing, the test files using this helper will skip themselves
// rather than wipe the dev DB.
export const TEST_DB_URL = process.env.TEST_DATABASE_URL || ''
export const HAS_TEST_DB = TEST_DB_URL.length > 0

const adapter = HAS_TEST_DB ? new PrismaPg({ connectionString: TEST_DB_URL }) : null
export const testPrisma = adapter ? new PrismaClient({ adapter }) : (null as unknown as PrismaClient)

export async function freshUser(id: string, opts: { isVendor?: boolean; balance?: number } = {}) {
  const now = new Date().toISOString()
  await testPrisma.user.upsert({
    where: { id },
    update: { walletBalance: opts.balance ?? 0, isVendor: opts.isVendor ?? false },
    create: {
      id,
      name: `test_${id}`,
      displayName: `Test ${id}`,
      walletBalance: opts.balance ?? 0,
      isVendor: opts.isVendor ?? false,
      createdAt: now,
      lastLogin: now,
      isAdmin: false,
    },
  })
}

export async function clearUserActivity(id: string) {
  await testPrisma.transactionLedger.deleteMany({ where: { userId: id } })
  await testPrisma.vendorPayout.deleteMany({ where: { vendorId: id } })
  await testPrisma.vendorEarning.deleteMany({ where: { vendorId: id } })
}

export async function getWallet(id: string): Promise<number> {
  const u = await testPrisma.user.findUnique({ where: { id }, select: { walletBalance: true } })
  return u ? Number(u.walletBalance) : 0
}
