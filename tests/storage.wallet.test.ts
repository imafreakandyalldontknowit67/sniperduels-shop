import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { HAS_TEST_DB, testPrisma, freshUser, clearUserActivity, getWallet } from './_db'

// These tests require TEST_DATABASE_URL pointing at a Postgres DB with the full
// migration history applied (including the wallet enforcement trigger). If absent,
// the suite is skipped — no production fallback to avoid accidental wipes.
const describeIfDb = HAS_TEST_DB ? describe : describe.skip

describeIfDb('wallet helpers + enforce_wallet_ledger trigger', () => {
  // Lazy-import the production storage module so it picks up the right DATABASE_URL
  // (the test setup overrides it before this point via process.env if needed).
  let storage: typeof import('../lib/storage')

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    storage = await import('../lib/storage')
  })

  beforeEach(async () => {
    await clearUserActivity('test_alice')
    await clearUserActivity('test_bob')
    await freshUser('test_alice', { isVendor: true, balance: 100 })
    await freshUser('test_bob', { isVendor: false, balance: 0 })
  })

  it('addToWallet credits + writes ledger row in one TX', async () => {
    const before = await getWallet('test_alice')
    const result = await storage.addToWallet('test_alice', 25, {
      type: 'deposit',
      description: 'test deposit',
    })
    expect(result).not.toBeNull()
    expect(await getWallet('test_alice')).toBeCloseTo(before + 25, 2)
    const rows = await testPrisma.transactionLedger.findMany({ where: { userId: 'test_alice', type: 'deposit' } })
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].amount)).toBeCloseTo(25, 2)
  })

  it('deductFromWallet rejects when insufficient (returns null, no DB change)', async () => {
    const before = await getWallet('test_alice')
    const result = await storage.deductFromWallet('test_alice', 999, {
      type: 'purchase',
      description: 'test overdraft',
    })
    expect(result).toBeNull()
    expect(await getWallet('test_alice')).toBeCloseTo(before, 2)
    const rows = await testPrisma.transactionLedger.findMany({ where: { userId: 'test_alice', type: 'purchase' } })
    expect(rows).toHaveLength(0)
  })

  it('deductFromWallet succeeds within balance', async () => {
    const result = await storage.deductFromWallet('test_alice', 30, {
      type: 'purchase',
      description: 'valid purchase',
    })
    expect(result).not.toBeNull()
    expect(await getWallet('test_alice')).toBeCloseTo(70, 2)
  })

  it('admin_adjust ledger amount is signed (negative on remove)', async () => {
    await storage.deductFromWallet('test_alice', 40, {
      type: 'admin_adjust',
      description: 'admin remove',
    })
    const rows = await testPrisma.transactionLedger.findMany({ where: { userId: 'test_alice', type: 'admin_adjust' } })
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].amount)).toBeCloseTo(-40, 2)
  })

  it('createAdminInitiatedPayout: insufficient → no payout, no ledger, wallet unchanged', async () => {
    const before = await getWallet('test_alice')
    const r = await storage.createAdminInitiatedPayout({
      vendorId: 'test_alice',
      adminId: 'test_admin',
      adminName: 'admin',
      amount: 9999,
      paymentMethod: 'PayPal',
      reference: 'test',
      notes: 'should fail',
    })
    expect(r && 'error' in r ? r.error : '').toBe('insufficient')
    expect(await getWallet('test_alice')).toBeCloseTo(before, 2)
    const payouts = await testPrisma.vendorPayout.findMany({ where: { vendorId: 'test_alice' } })
    expect(payouts).toHaveLength(0)
    const ledger = await testPrisma.transactionLedger.findMany({ where: { userId: 'test_alice' } })
    expect(ledger).toHaveLength(0)
  })

  it('createAdminInitiatedPayout: success → wallet debited + payout row + ledger row', async () => {
    const r = await storage.createAdminInitiatedPayout({
      vendorId: 'test_alice',
      adminId: 'test_admin',
      adminName: 'admin',
      amount: 60,
      paymentMethod: 'PayPal',
      reference: 'tx_xyz',
      notes: 'integration test payout',
    })
    expect(r && !('error' in r) ? r.payout.id : null).toBeTruthy()
    expect(await getWallet('test_alice')).toBeCloseTo(40, 2)

    const payouts = await testPrisma.vendorPayout.findMany({ where: { vendorId: 'test_alice', status: 'completed' } })
    expect(payouts).toHaveLength(1)
    expect(Number(payouts[0].amount)).toBeCloseTo(60, 2)

    const ledger = await testPrisma.transactionLedger.findMany({ where: { userId: 'test_alice', type: 'vendor_payout' } })
    expect(ledger).toHaveLength(1)
    expect(Number(ledger[0].amount)).toBeCloseTo(60, 2)
  })

  it('TRIGGER: raw UPDATE without permission token is rejected', async () => {
    let err: any = null
    try {
      await testPrisma.$executeRawUnsafe(
        `UPDATE "User" SET "walletBalance" = "walletBalance" + 1 WHERE id = $1`,
        'test_alice'
      )
    } catch (e) {
      err = e
    }
    expect(err).not.toBeNull()
    expect(String(err?.message || err)).toMatch(/app\.allow_wallet_change/)
    // Wallet untouched
    expect(await getWallet('test_alice')).toBeCloseTo(100, 2)
  })

  it('TRIGGER: raw UPDATE WITH permission token succeeds (proves bypass works)', async () => {
    await testPrisma.$transaction(async (tx) => {
      await tx.transactionLedger.create({
        data: {
          type: 'admin_adjust',
          userId: 'test_alice',
          amount: 1,
          description: 'test bypass',
          createdAt: new Date().toISOString(),
        },
      })
      await tx.$executeRawUnsafe(`SET LOCAL app.allow_wallet_change = 'true'`)
      await tx.$executeRawUnsafe(
        `UPDATE "User" SET "walletBalance" = "walletBalance" + 1 WHERE id = $1`,
        'test_alice'
      )
    })
    expect(await getWallet('test_alice')).toBeCloseTo(101, 2)
  })
})
