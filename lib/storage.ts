import { prisma } from './prisma'
import { Prisma } from './generated/prisma/client'
import { effectiveFeeRate, recomputeVendorTier } from './vendor-fees'

type Decimal = Prisma.Decimal
import { RARITIES, FX_EFFECTS, FRAGTRAK_TYPES } from './constants'
import type { Rarity, FxEffect, FragtrakType } from './constants'

// Re-export for backwards compatibility
export { RARITIES, FX_EFFECTS, FRAGTRAK_TYPES }
export type { Rarity, FxEffect, FragtrakType }

// Import loyalty functions for local use and re-export
import { LOYALTY_TIERS, calculateLoyaltyTier, getLoyaltyDiscount } from './loyalty'
import type { LoyaltyTier } from './loyalty'
export { LOYALTY_TIERS, calculateLoyaltyTier, getLoyaltyDiscount }
export type { LoyaltyTier }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a Prisma Decimal to a plain JS number */
function d(v: Decimal | number | null | undefined): number {
  if (v == null) return 0
  return typeof v === 'number' ? v : Number(v)
}

// ─── User types (kept identical for callers) ─────────────────────────────────

export interface StoredUser {
  id: string
  name: string
  displayName: string
  avatar?: string
  robloxCreatedAt?: string
  discordId?: string
  discordUsername?: string
  discordAvatar?: string
  discordLinkedAt?: string
  walletBalance: number
  lifetimeSpend: number
  discordFirstPurchaseUsed: boolean
  referredBy?: string
  createdAt: string
  lastLogin: string
  isAdmin: boolean
  isVendor: boolean
  notifyOnBotRecovery: boolean
  lastRecoveryDmSentAt?: string
}

function toStoredUser(row: {
  id: string
  name: string
  displayName: string
  avatar: string | null
  robloxCreatedAt: string | null
  discordId: string | null
  discordUsername: string | null
  discordAvatar: string | null
  discordLinkedAt: string | null
  walletBalance: Decimal
  lifetimeSpend: Decimal
  discordFirstPurchaseUsed: boolean
  referralCode: string | null
  referredBy: string | null
  referralCreditedAt: string | null
  createdAt: string
  lastLogin: string
  isAdmin: boolean
  isVendor: boolean
  notifyOnBotRecovery: boolean
  lastRecoveryDmSentAt: Date | null
}): StoredUser {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    avatar: row.avatar ?? undefined,
    robloxCreatedAt: row.robloxCreatedAt ?? undefined,
    discordId: row.discordId ?? undefined,
    discordUsername: row.discordUsername ?? undefined,
    discordAvatar: row.discordAvatar ?? undefined,
    discordLinkedAt: row.discordLinkedAt ?? undefined,
    walletBalance: d(row.walletBalance),
    lifetimeSpend: d(row.lifetimeSpend),
    discordFirstPurchaseUsed: row.discordFirstPurchaseUsed,
    referredBy: row.referredBy ?? undefined,
    createdAt: row.createdAt,
    lastLogin: row.lastLogin,
    isAdmin: row.isAdmin,
    isVendor: row.isVendor,
    notifyOnBotRecovery: row.notifyOnBotRecovery,
    lastRecoveryDmSentAt: row.lastRecoveryDmSentAt?.toISOString(),
  }
}

// ─── User functions ──────────────────────────────────────────────────────────

export async function getUsers(): Promise<StoredUser[]> {
  const rows = await prisma.user.findMany()
  return rows.map(toStoredUser)
}

export async function getUser(id: string): Promise<StoredUser | undefined> {
  const row = await prisma.user.findUnique({ where: { id } })
  return row ? toStoredUser(row) : undefined
}

export async function upsertUser(
  user: Omit<StoredUser, 'createdAt' | 'lastLogin' | 'walletBalance' | 'lifetimeSpend' | 'discordFirstPurchaseUsed' | 'isVendor' | 'notifyOnBotRecovery' | 'lastRecoveryDmSentAt'> & { isAdmin?: boolean }
): Promise<StoredUser> {
  const now = new Date().toISOString()

  const row = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      avatar: user.avatar,
      robloxCreatedAt: user.robloxCreatedAt,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      discordAvatar: user.discordAvatar,
      discordLinkedAt: user.discordLinkedAt,
      walletBalance: 0,
      lifetimeSpend: 0,
      discordFirstPurchaseUsed: false,
      isAdmin: user.isAdmin || false,
      isVendor: false,
      createdAt: now,
      lastLogin: now,
    },
    update: {
      name: user.name,
      displayName: user.displayName,
      avatar: user.avatar,
      robloxCreatedAt: user.robloxCreatedAt,
      isAdmin: user.isAdmin || false,
      lastLogin: now,
      // Only update Discord fields if provided (preserve existing link)
      ...(user.discordId
        ? {
            discordId: user.discordId,
            discordUsername: user.discordUsername,
            discordAvatar: user.discordAvatar,
            discordLinkedAt: user.discordLinkedAt,
          }
        : {}),
    },
  })

  return toStoredUser(row)
}

export async function linkDiscordToUser(
  userId: string,
  discord: { id: string; username: string; avatar?: string }
): Promise<StoredUser | null> {
  try {
    const existing = await prisma.user.findUnique({
      where: { discordId: discord.id },
      select: { id: true },
    })
    if (existing && existing.id !== userId) {
      // The Discord id is already claimed by another row. If that row is a
      // Discord-bot orphan (`discord_<id>`), it's the SAME person who used the
      // bot before logging into the site — merge it into this Roblox account
      // (carrying balance + history) instead of failing the link.
      if (existing.id.startsWith('discord_')) {
        const merge = await mergeUserAccounts(existing.id, userId)
        if (!merge.ok) {
          console.error(`[storage] linkDiscordToUser merge failed (${existing.id} -> ${userId}):`, merge.error)
          return null
        }
        // fall through to set fresh Discord fields on the canonical row
      } else {
        // A real Roblox account already owns this Discord id — genuine conflict.
        return null
      }
    }

    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: discord.id,
        discordUsername: discord.username,
        discordAvatar: discord.avatar,
        discordLinkedAt: new Date().toISOString(),
      },
    })
    return toStoredUser(row)
  } catch (err) {
    console.error('[storage] linkDiscordToUser failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

export async function unlinkDiscordFromUser(userId: string): Promise<StoredUser | null> {
  try {
    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: null,
        discordUsername: null,
        discordAvatar: null,
        discordLinkedAt: null,
      },
    })
    return toStoredUser(row)
  } catch (err) {
    console.error('[storage] unlinkDiscordFromUser failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}

// ─── Wallet functions ────────────────────────────────────────────────────────

const MAX_WALLET_BALANCE = 100_000

export async function getWalletBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } })
  return user ? d(user.walletBalance) : 0
}

// Wallet writes are gated by the Postgres trigger `enforce_wallet_ledger_trg`,
// which requires the session var app.allow_wallet_change='true' inside the same
// transaction as the wallet UPDATE. The token is set after the matching
// TransactionLedger row is inserted, so a wallet change can never reach COMMIT
// without an audit row.
export type WalletLedgerInput = {
  type: LedgerType
  description: string
  relatedId?: string
}

async function allowWalletChange(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRawUnsafe(`SET LOCAL app.allow_wallet_change = 'true'`)
}

export async function updateWalletBalance(
  userId: string,
  amount: number,
  ledgerEntry: WalletLedgerInput
): Promise<StoredUser | null> {
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_WALLET_BALANCE) return null

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const locked: Array<{ walletBalance: number }> = await tx.$queryRawUnsafe(
      'SELECT "walletBalance" FROM "User" WHERE id = $1 FOR UPDATE', userId
    )
    if (!locked.length) return null
    const previous = Math.round(d(locked[0].walletBalance) * 100) / 100
    const next = Math.round(amount * 100) / 100

    // Convention: most types carry a positive magnitude (direction encoded in
    // the type itself — purchase=debit, refund=credit, etc). admin_adjust is the
    // exception: it can go either way, so we store the SIGNED delta so the
    // reconciliation can sum it directly without inferring direction.
    const signed = Math.round((next - previous) * 100) / 100
    await tx.transactionLedger.create({
      data: {
        type: ledgerEntry.type,
        userId,
        amount: ledgerEntry.type === 'admin_adjust' ? signed : Math.abs(signed),
        description: ledgerEntry.description,
        relatedId: ledgerEntry.relatedId,
        createdAt: new Date().toISOString(),
      },
    })
    await allowWalletChange(tx)
    const row = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: next },
    })
    return toStoredUser(row)
  })
}

export async function addToWallet(
  userId: string,
  amount: number,
  ledgerEntry: WalletLedgerInput
): Promise<StoredUser | null> {
  if (!Number.isFinite(amount) || amount < 0) return null

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const locked: Array<{ walletBalance: number }> = await tx.$queryRawUnsafe(
      'SELECT "walletBalance" FROM "User" WHERE id = $1 FOR UPDATE', userId
    )
    if (!locked.length) return null

    const currentBalance = Number(locked[0].walletBalance)
    const newBalance = Math.round((currentBalance + amount) * 100) / 100
    if (newBalance > MAX_WALLET_BALANCE) return null

    await tx.transactionLedger.create({
      data: {
        type: ledgerEntry.type,
        userId,
        amount: Math.round(amount * 100) / 100,
        description: ledgerEntry.description,
        relatedId: ledgerEntry.relatedId,
        createdAt: new Date().toISOString(),
      },
    })
    await allowWalletChange(tx)
    const row = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: newBalance },
    })
    return toStoredUser(row)
  })
}

export async function deductFromWallet(
  userId: string,
  amount: number,
  ledgerEntry: WalletLedgerInput
): Promise<StoredUser | null> {
  if (!Number.isFinite(amount) || amount < 0) return null

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const locked: Array<{ walletBalance: number }> = await tx.$queryRawUnsafe(
      'SELECT "walletBalance" FROM "User" WHERE id = $1 FOR UPDATE', userId
    )
    if (!locked.length) return null

    const currentBalance = Math.round(d(locked[0].walletBalance) * 100) / 100
    const rounded = Math.round(amount * 100) / 100
    if (currentBalance < rounded) return null

    // admin_adjust stores signed delta; other debit types store magnitude (type implies direction).
    await tx.transactionLedger.create({
      data: {
        type: ledgerEntry.type,
        userId,
        amount: ledgerEntry.type === 'admin_adjust' ? -rounded : rounded,
        description: ledgerEntry.description,
        relatedId: ledgerEntry.relatedId,
        createdAt: new Date().toISOString(),
      },
    })
    await allowWalletChange(tx)
    const row = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: Math.round((currentBalance - rounded) * 100) / 100 },
    })
    return toStoredUser(row)
  })
}

// ─── Account merge (dedupe Discord-bot vs Roblox-OAuth rows) ─────────────────

export interface MergeResult {
  ok: boolean
  orphanId: string
  canonicalId: string
  movedBalance: number
  reassigned: Record<string, number>
  skipped: string[]
  error?: string
}

/**
 * Merge a duplicate (orphan) user row into the canonical user row, then delete
 * the orphan. Heals the Discord-bot ↔ site duplication where the bot creates a
 * synthetic `discord_<id>` row keyed differently from the site's Roblox-id row.
 *
 * Atomic + ledger-safe: balance is moved through a TransactionLedger row +
 * `allowWalletChange` (the same path addToWallet uses), so the
 * `enforce_wallet_ledger_trg` trigger is satisfied. All child FK rows are
 * reassigned before the orphan is deleted.
 */
export async function mergeUserAccounts(orphanId: string, canonicalId: string): Promise<MergeResult> {
  const result: MergeResult = { ok: false, orphanId, canonicalId, movedBalance: 0, reassigned: {}, skipped: [] }
  if (!orphanId || !canonicalId || orphanId === canonicalId) {
    result.error = 'invalid or identical ids'
    return result
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orphan = await tx.user.findUnique({ where: { id: orphanId } })
      const canonical = await tx.user.findUnique({ where: { id: canonicalId } })
      if (!orphan) throw new Error(`orphan ${orphanId} not found`)
      if (!canonical) throw new Error(`canonical ${canonicalId} not found`)

      const moveDiscord = !!orphan.discordId && !canonical.discordId
      const moveReferral = !!orphan.referralCode && !canonical.referralCode
      if (orphan.discordId && canonical.discordId) result.skipped.push('discord (canonical already linked)')

      // 1. Clear the unique fields off the orphan first so moving them to the
      //    canonical row cannot trip the unique indexes mid-transaction.
      if (orphan.discordId || orphan.referralCode) {
        await tx.user.update({
          where: { id: orphanId },
          data: {
            ...(orphan.discordId ? { discordId: null, discordUsername: null, discordAvatar: null, discordLinkedAt: null } : {}),
            ...(moveReferral ? { referralCode: null } : {}),
          },
        })
      }

      // 2. Reassign child FK rows orphan -> canonical.
      const reassign = async (label: string, fn: () => Promise<{ count: number }>) => {
        try {
          const r = await fn()
          if (r.count) result.reassigned[label] = r.count
        } catch (e) {
          result.skipped.push(`${label}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
      await reassign('order', () => tx.order.updateMany({ where: { userId: orphanId }, data: { userId: canonicalId } }))
      await reassign('deposit', () => tx.deposit.updateMany({ where: { userId: orphanId }, data: { userId: canonicalId } }))
      await reassign('transactionLedger', () => tx.transactionLedger.updateMany({ where: { userId: orphanId }, data: { userId: canonicalId } }))
      await reassign('pendingBuyIntent', () => tx.pendingBuyIntent.updateMany({ where: { userId: orphanId }, data: { userId: canonicalId } }))
      await reassign('vaultItem', () => tx.vaultItem.updateMany({ where: { ownerId: orphanId }, data: { ownerId: canonicalId } }))
      await reassign('itemDepositSession', () => tx.itemDepositSession.updateMany({ where: { userId: orphanId }, data: { userId: canonicalId } }))
      await reassign('itemDeliveryJob', () => tx.itemDeliveryJob.updateMany({ where: { buyerUserId: orphanId }, data: { buyerUserId: canonicalId } }))
      await reassign('itemWithdrawalJob', () => tx.itemWithdrawalJob.updateMany({ where: { userId: orphanId }, data: { userId: canonicalId } }))
      await reassign('vendorDeposit', () => tx.vendorDeposit.updateMany({ where: { vendorId: orphanId }, data: { vendorId: canonicalId } }))
      await reassign('vendorEarning', () => tx.vendorEarning.updateMany({ where: { vendorId: orphanId }, data: { vendorId: canonicalId } }))
      await reassign('vendorPayout', () => tx.vendorPayout.updateMany({ where: { vendorId: orphanId }, data: { vendorId: canonicalId } }))

      // 1:1 / unique relations — only move if canonical doesn't already have one.
      const orphanListing = await tx.vendorGemListing.findUnique({ where: { vendorId: orphanId } })
      if (orphanListing) {
        const canonListing = await tx.vendorGemListing.findUnique({ where: { vendorId: canonicalId } })
        if (!canonListing) await reassign('vendorGemListing', () => tx.vendorGemListing.updateMany({ where: { vendorId: orphanId }, data: { vendorId: canonicalId } }))
        else result.skipped.push('vendorGemListing (both have one)')
      }
      const orphanCreator = await tx.creatorProfile.findUnique({ where: { userId: orphanId } })
      if (orphanCreator) {
        const canonCreator = await tx.creatorProfile.findUnique({ where: { userId: canonicalId } })
        if (!canonCreator) await reassign('creatorProfile', () => tx.creatorProfile.updateMany({ where: { userId: orphanId }, data: { userId: canonicalId } }))
        else result.skipped.push('creatorProfile (both have one)')
      }

      // 3. Fold balance (ledger-safe), loyalty, and the moved unique fields onto canonical.
      const movedBalance = Math.round(d(orphan.walletBalance) * 100) / 100
      const data: Prisma.UserUpdateInput = {
        lifetimeSpend: Math.round((d(canonical.lifetimeSpend) + d(orphan.lifetimeSpend)) * 100) / 100,
        discordFirstPurchaseUsed: canonical.discordFirstPurchaseUsed || orphan.discordFirstPurchaseUsed,
      }
      if (moveDiscord) {
        data.discordId = orphan.discordId
        data.discordUsername = orphan.discordUsername
        data.discordAvatar = orphan.discordAvatar
        data.discordLinkedAt = orphan.discordLinkedAt
      }
      if (moveReferral) data.referralCode = orphan.referralCode
      if (movedBalance > 0) {
        await tx.transactionLedger.create({
          data: {
            type: 'admin_adjust',
            userId: canonicalId,
            amount: movedBalance,
            description: `account merge from ${orphanId}`,
            relatedId: orphanId,
            createdAt: new Date().toISOString(),
          },
        })
        await allowWalletChange(tx)
        data.walletBalance = Math.round((d(canonical.walletBalance) + movedBalance) * 100) / 100
      }
      await tx.user.update({ where: { id: canonicalId }, data })
      result.movedBalance = movedBalance

      // 4. Delete the orphan (children reassigned, balance/links moved off).
      await tx.user.delete({ where: { id: orphanId } })
    }, { timeout: 30000 })

    result.ok = true
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e)
  }
  return result
}

// ─── Loyalty functions ───────────────────────────────────────────────────────

export async function getUserLoyaltyInfo(userId: string): Promise<{
  tier: LoyaltyTier
  discount: number
  lifetimeSpend: number
  nextTier: LoyaltyTier | null
  spendToNextTier: number
}> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lifetimeSpend: true } })
  const lifetimeSpend = user ? d(user.lifetimeSpend) : 0
  const tier = calculateLoyaltyTier(lifetimeSpend)
  const discount = getLoyaltyDiscount(tier)

  let nextTier: LoyaltyTier | null = null
  let spendToNextTier = 0

  if (tier === 'member') {
    nextTier = 'silver'
    spendToNextTier = LOYALTY_TIERS.silver.minSpend - lifetimeSpend
  } else if (tier === 'silver') {
    nextTier = 'gold'
    spendToNextTier = LOYALTY_TIERS.gold.minSpend - lifetimeSpend
  }

  return { tier, discount, lifetimeSpend, nextTier, spendToNextTier }
}

export async function addToLifetimeSpend(userId: string, amount: number): Promise<StoredUser | null> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { lifetimeSpend: true } })
    if (!user) return null

    const currentSpend = d(user.lifetimeSpend)
    const row = await prisma.user.update({
      where: { id: userId },
      data: { lifetimeSpend: Math.max(0, currentSpend + amount) },
    })
    return toStoredUser(row)
  } catch {
    return null
  }
}

export async function markDiscordFirstPurchaseUsed(userId: string): Promise<StoredUser | null> {
  try {
    const row = await prisma.user.update({
      where: { id: userId },
      data: { discordFirstPurchaseUsed: true },
    })
    return toStoredUser(row)
  } catch {
    return null
  }
}

export async function canUseDiscordFirstPurchaseDiscount(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discordId: true, discordFirstPurchaseUsed: true },
  })
  if (!user) return false
  return !!user.discordId && !user.discordFirstPurchaseUsed
}

// ─── Order types (kept identical) ────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'

export interface Order {
  id: string
  userId: string
  userName: string
  type: 'gems' | 'item' | 'crate'
  itemName: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  status: OrderStatus
  playerReady: boolean
  skippedAt?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  reachedFrontAt?: string
  notes?: string
  vendorListingId?: string
}

function toOrder(row: {
  id: string
  userId: string
  userName: string
  type: string
  itemName: string
  quantity: number
  pricePerUnit: Decimal
  totalPrice: Decimal
  status: string
  playerReady: boolean
  skippedAt: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  reachedFrontAt: string | null
  notes: string | null
  vendorListingId: string | null
}): Order {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    type: row.type as Order['type'],
    itemName: row.itemName,
    quantity: row.quantity,
    pricePerUnit: d(row.pricePerUnit),
    totalPrice: d(row.totalPrice),
    status: row.status as OrderStatus,
    playerReady: row.playerReady,
    skippedAt: row.skippedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? undefined,
    reachedFrontAt: row.reachedFrontAt ?? undefined,
    notes: row.notes ?? undefined,
    vendorListingId: row.vendorListingId ?? undefined,
  }
}

// ─── Order functions ─────────────────────────────────────────────────────────

export async function getOrders(): Promise<Order[]> {
  const rows = await prisma.order.findMany()
  return rows.map(toOrder)
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const row = await prisma.order.findUnique({ where: { id } })
  return row ? toOrder(row) : undefined
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({ where: { userId } })
  return rows.map(toOrder)
}

export async function createOrder(
  order: Omit<Order, 'id' | 'playerReady' | 'createdAt' | 'updatedAt'>
): Promise<Order> {
  const now = new Date().toISOString()
  const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const row = await prisma.order.create({
    data: {
      id,
      userId: order.userId,
      userName: order.userName,
      type: order.type,
      itemName: order.itemName,
      quantity: order.quantity,
      pricePerUnit: order.pricePerUnit,
      totalPrice: order.totalPrice,
      status: order.status,
      playerReady: false,
      createdAt: now,
      updatedAt: now,
      completedAt: order.completedAt,
      notes: order.notes,
      vendorListingId: order.vendorListingId,
    },
  })

  return toOrder(row)
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
  try {
    // Strip out fields that shouldn't be directly passed to Prisma
    const { id: _id, userId: _uid, ...safeUpdates } = updates

    const row = await prisma.order.update({
      where: { id },
      data: {
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      },
    })
    return toOrder(row)
  } catch {
    return null
  }
}

/**
 * Atomically update an order only if its current status matches expectedStatus.
 * Uses updateMany with a WHERE status guard so concurrent calls can't both succeed.
 * Returns the updated order if the transition succeeded, or null if someone else already changed it.
 */
export async function updateOrderStatus(
  id: string,
  expectedStatus: string | string[],
  updates: Partial<Order>
): Promise<Order | null> {
  const statusFilter = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]
  const { id: _id, userId: _uid, status, ...restUpdates } = updates

  const result = await prisma.order.updateMany({
    where: { id, status: { in: statusFilter as never[] } },
    data: {
      ...restUpdates,
      ...(status ? { status: status as never } : {}),
      updatedAt: new Date().toISOString(),
    },
  })

  if (result.count === 0) return null
  return (await getOrder(id)) ?? null
}

// ─── Stock/Inventory types (kept identical) ──────────────────────────────────

export interface StockItem {
  id: string
  name: string
  type: 'sniper' | 'knife' | 'crate'
  description?: string
  priceUsd: number
  stock: number
  imageUrl?: string
  rarity?: Rarity
  fx?: FxEffect
  fragtrak?: FragtrakType
  active: boolean
  createdAt: string
  updatedAt: string
}

function toStockItem(row: {
  id: string
  name: string
  type: string
  description: string | null
  priceUsd: Decimal
  stock: number
  imageUrl: string | null
  rarity: string | null
  fx: string | null
  fragtrak: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}): StockItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type as StockItem['type'],
    description: row.description ?? undefined,
    priceUsd: d(row.priceUsd),
    stock: row.stock,
    imageUrl: row.imageUrl ?? undefined,
    rarity: (row.rarity as Rarity) ?? undefined,
    fx: (row.fx as FxEffect) ?? undefined,
    fragtrak: (row.fragtrak as FragtrakType) ?? undefined,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ─── Stock functions ─────────────────────────────────────────────────────────

export async function getStock(): Promise<StockItem[]> {
  const rows = await prisma.stockItem.findMany()
  return rows.map(toStockItem)
}

export async function getStockItem(id: string): Promise<StockItem | undefined> {
  const row = await prisma.stockItem.findUnique({ where: { id } })
  return row ? toStockItem(row) : undefined
}

export async function getActiveStock(): Promise<StockItem[]> {
  const rows = await prisma.stockItem.findMany({ where: { active: true, stock: { gt: 0 } } })
  return rows.map(toStockItem)
}

export async function createStockItem(
  item: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StockItem> {
  const now = new Date().toISOString()
  const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const row = await prisma.stockItem.create({
    data: {
      id,
      name: item.name,
      type: item.type,
      description: item.description,
      priceUsd: item.priceUsd,
      stock: item.stock,
      imageUrl: item.imageUrl,
      rarity: item.rarity,
      fx: item.fx,
      fragtrak: item.fragtrak,
      active: item.active,
      createdAt: now,
      updatedAt: now,
    },
  })

  return toStockItem(row)
}

export async function updateStockItem(id: string, updates: Partial<StockItem>): Promise<StockItem | null> {
  try {
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates

    const row = await prisma.stockItem.update({
      where: { id },
      data: {
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      },
    })
    return toStockItem(row)
  } catch {
    return null
  }
}

export async function deductItemStock(itemId: string, quantity: number): Promise<boolean> {
  if (!Number.isFinite(quantity) || quantity <= 0) return false
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const locked: Array<{ stock: number }> = await tx.$queryRawUnsafe(
      'SELECT "stock" FROM "StockItem" WHERE id = $1 FOR UPDATE', itemId
    )
    if (!locked.length || locked[0].stock < quantity) return false
    await tx.stockItem.update({
      where: { id: itemId },
      data: { stock: locked[0].stock - quantity, updatedAt: new Date().toISOString() },
    })
    return true
  })
}

export async function deleteStockItem(id: string): Promise<boolean> {
  try {
    await prisma.stockItem.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

// ─── Deposit types (kept identical) ──────────────────────────────────────────

export type DepositStatus = 'pending' | 'completed' | 'failed' | 'expired'

export interface Deposit {
  id: string
  userId: string
  amount: number
  processingFee?: number
  chargeAmount?: number
  status: DepositStatus
  pandabaseInvoiceId: string
  pandabaseRefId?: string
  pandabaseCheckoutUrl: string
  paymentProviderId?: string
  localAmount?: number
  localCurrency?: string
  fxRate?: number
  createdAt: string
  updatedAt: string
  completedAt?: string
}

function toDeposit(row: Record<string, unknown>): Deposit {
  return {
    id: row.id as string,
    userId: row.userId as string,
    amount: d(row.amount as Decimal),
    processingFee: row.processingFee != null ? d(row.processingFee as Decimal) : undefined,
    chargeAmount: row.chargeAmount != null ? d(row.chargeAmount as Decimal) : undefined,
    status: row.status as DepositStatus,
    pandabaseInvoiceId: row.pandabaseInvoiceId as string,
    pandabaseRefId: (row.pandabaseRefId as string | null) ?? undefined,
    pandabaseCheckoutUrl: row.pandabaseCheckoutUrl as string,
    paymentProviderId: (row.paymentProviderId as string | null) ?? undefined,
    localAmount: row.localAmount != null ? d(row.localAmount as Decimal) : undefined,
    localCurrency: (row.localCurrency as string | null) ?? undefined,
    fxRate: row.fxRate != null ? d(row.fxRate as Decimal) : undefined,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
    completedAt: (row.completedAt as string | null) ?? undefined,
  }
}

// ─── Deposit functions ───────────────────────────────────────────────────────

export async function getDeposits(): Promise<Deposit[]> {
  const rows = await prisma.deposit.findMany()
  return rows.map(toDeposit)
}

export async function getDeposit(id: string): Promise<Deposit | undefined> {
  const row = await prisma.deposit.findUnique({ where: { id } })
  return row ? toDeposit(row) : undefined
}

export async function getDepositByInvoiceId(pandabaseInvoiceId: string): Promise<Deposit | undefined> {
  const row = await prisma.deposit.findUnique({ where: { pandabaseInvoiceId } })
  return row ? toDeposit(row) : undefined
}

export async function getDepositByRefId(refId: string): Promise<Deposit | undefined> {
  const row = await prisma.deposit.findFirst({ where: { pandabaseRefId: refId } })
  return row ? toDeposit(row) : undefined
}

export async function getUserDeposits(userId: string): Promise<Deposit[]> {
  const rows = await prisma.deposit.findMany({ where: { userId } })
  return rows.map(toDeposit)
}

export async function createDeposit(
  deposit: Omit<Deposit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Deposit> {
  const now = new Date().toISOString()
  const id = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const row = await prisma.deposit.create({
    data: {
      id,
      userId: deposit.userId,
      amount: deposit.amount,
      processingFee: deposit.processingFee,
      chargeAmount: deposit.chargeAmount,
      status: deposit.status,
      pandabaseInvoiceId: deposit.pandabaseInvoiceId,
      pandabaseRefId: deposit.pandabaseRefId,
      pandabaseCheckoutUrl: deposit.pandabaseCheckoutUrl,
      localAmount: deposit.localAmount,
      localCurrency: deposit.localCurrency,
      fxRate: deposit.fxRate,
      createdAt: now,
      updatedAt: now,
      completedAt: deposit.completedAt,
    },
  })

  return toDeposit(row)
}

const DEPOSIT_EXPIRY_MS = 6 * 60 * 60 * 1000 // 6 hours (matches Pandabase checkout session lifetime)

export async function expireStaleDeposits(): Promise<number> {
  const cutoff = new Date(Date.now() - DEPOSIT_EXPIRY_MS).toISOString()
  const result = await prisma.deposit.updateMany({
    where: {
      status: 'pending',
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'expired',
      updatedAt: new Date().toISOString(),
    },
  })
  return result.count
}

export async function updateDeposit(id: string, updates: Partial<Deposit>): Promise<Deposit | null> {
  try {
    const { id: _id, userId: _uid, ...safeUpdates } = updates

    const row = await prisma.deposit.update({
      where: { id },
      data: {
        ...safeUpdates,
        updatedAt: new Date().toISOString(),
      },
    })
    return toDeposit(row)
  } catch {
    return null
  }
}

/**
 * Atomically claim a pending deposit by setting it to completed.
 * Uses updateMany with a status='pending' WHERE clause so only the first
 * caller wins — subsequent calls match zero rows and return false.
 * This prevents double-credit from concurrent verify + webhook requests.
 */
export async function claimPendingDeposit(id: string): Promise<boolean> {
  const result = await prisma.deposit.updateMany({
    where: { id, status: 'pending' },
    data: {
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  return result.count > 0
}

/**
 * Atomically claim an expired deposit (late webhook recovery).
 * Same pattern as claimPendingDeposit but for expired → completed.
 */
export async function claimExpiredDeposit(id: string): Promise<boolean> {
  const result = await prisma.deposit.updateMany({
    where: { id, status: 'expired' },
    data: {
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  return result.count > 0
}

// ─── Gem Stock ───────────────────────────────────────────────────────────────

export async function getGemStock(): Promise<number> {
  const row = await prisma.gemStock.findUnique({ where: { id: 'singleton' } })
  return row?.balanceInK ?? 0
}

export async function setGemStock(balanceInK: number): Promise<number> {
  await prisma.gemStock.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', balanceInK, updatedAt: new Date().toISOString() },
    update: { balanceInK, updatedAt: new Date().toISOString() },
  })
  return balanceInK
}

export async function deductGemStock(amountInK: number): Promise<boolean> {
  if (!Number.isFinite(amountInK) || amountInK <= 0) return false
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Lock the gem stock row to prevent concurrent reads (race condition fix)
    const locked: Array<{ balanceInK: number }> = await tx.$queryRawUnsafe(
      'SELECT "balanceInK" FROM "GemStock" WHERE id = \'singleton\' FOR UPDATE'
    )
    const current = locked.length ? locked[0].balanceInK : 0
    if (current < amountInK) return false
    await tx.gemStock.update({
      where: { id: 'singleton' },
      data: { balanceInK: current - amountInK, updatedAt: new Date().toISOString() },
    })
    return true
  })
}

export async function addGemStock(amountInK: number): Promise<number> {
  if (!Number.isFinite(amountInK) || amountInK <= 0) return 0
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const locked: Array<{ balanceInK: number }> = await tx.$queryRawUnsafe(
      'SELECT "balanceInK" FROM "GemStock" WHERE id = \'singleton\' FOR UPDATE'
    )
    const current = locked.length ? locked[0].balanceInK : 0
    const newBalance = current + amountInK
    await tx.gemStock.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', balanceInK: newBalance, updatedAt: new Date().toISOString() },
      update: { balanceInK: newBalance, updatedAt: new Date().toISOString() },
    })
    return newBalance
  })
}

// ─── Site Settings ──────────────────────────────────────────────────────────

export interface SiteSettings {
  itemsComingSoon: boolean
  depositsDisabled: boolean
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
  return {
    itemsComingSoon: row?.itemsComingSoon ?? true,
    depositsDisabled: row?.depositsDisabled ?? false,
  }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const now = new Date().toISOString()
  const row = await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      itemsComingSoon: settings.itemsComingSoon ?? true,
      depositsDisabled: settings.depositsDisabled ?? false,
      updatedAt: now,
    },
    update: {
      ...(settings.itemsComingSoon !== undefined ? { itemsComingSoon: settings.itemsComingSoon } : {}),
      ...(settings.depositsDisabled !== undefined ? { depositsDisabled: settings.depositsDisabled } : {}),
      updatedAt: now,
    },
  })
  return {
    itemsComingSoon: row.itemsComingSoon,
    depositsDisabled: row.depositsDisabled,
  }
}

// ─── Analytics helpers ───────────────────────────────────────────────────────

// ─── Vendor functions ───────────────────────────────────────────────────────

export interface VendorGemListing {
  id: string
  vendorId: string
  pricePerK: number
  minOrderK: number
  maxOrderK: number
  stockK: number
  bulkTiers: Array<{ minK: number; pricePerK: number }> | null
  platformFeeRate: number | null
  autoFeeRate: number | null
  feeTierBelowSince: string | null
  rolling7dVolumeK: number
  active: boolean
  createdAt: string
  updatedAt: string
}

function toVendorGemListing(row: {
  id: string
  vendorId: string
  pricePerK: Decimal
  minOrderK: number
  maxOrderK: number
  stockK: number
  bulkTiers: string | null
  platformFeeRate: Decimal | null
  autoFeeRate?: Decimal | null
  feeTierBelowSince?: Date | null
  rolling7dVolumeK?: number
  active: boolean
  createdAt: string
  updatedAt: string
}): VendorGemListing {
  let bulkTiers: Array<{ minK: number; pricePerK: number }> | null = null
  if (row.bulkTiers) {
    try { bulkTiers = JSON.parse(row.bulkTiers) } catch { /* ignore */ }
  }
  return {
    id: row.id,
    vendorId: row.vendorId,
    pricePerK: d(row.pricePerK),
    minOrderK: row.minOrderK,
    maxOrderK: row.maxOrderK,
    stockK: row.stockK,
    bulkTiers,
    platformFeeRate: row.platformFeeRate != null ? d(row.platformFeeRate) : null,
    autoFeeRate: row.autoFeeRate != null ? d(row.autoFeeRate) : null,
    feeTierBelowSince: row.feeTierBelowSince ? row.feeTierBelowSince.toISOString() : null,
    rolling7dVolumeK: row.rolling7dVolumeK ?? 0,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getVendors(): Promise<StoredUser[]> {
  const rows = await prisma.user.findMany({ where: { isVendor: true } })
  return rows.map(toStoredUser)
}

export async function setVendorStatus(userId: string, isVendor: boolean): Promise<StoredUser | null> {
  try {
    const row = await prisma.user.update({
      where: { id: userId },
      data: { isVendor },
    })
    return toStoredUser(row)
  } catch {
    return null
  }
}

export async function getVendorListing(vendorId: string): Promise<VendorGemListing | null> {
  const row = await prisma.vendorGemListing.findUnique({ where: { vendorId } })
  return row ? toVendorGemListing(row) : null
}

export async function getActiveVendorListings(): Promise<(VendorGemListing & { vendorName: string })[]> {
  const rows = await prisma.vendorGemListing.findMany({
    where: { active: true, stockK: { gt: 0 } },
    include: { vendor: { select: { name: true } } },
    orderBy: { pricePerK: 'asc' },
  })
  return rows.map(row => ({
    ...toVendorGemListing(row),
    vendorName: row.vendor.name,
  }))
}

export async function upsertVendorListing(
  vendorId: string,
  data: { pricePerK: number; minOrderK?: number; maxOrderK?: number; bulkTiers?: Array<{ minK: number; pricePerK: number }> | null }
): Promise<VendorGemListing> {
  const now = new Date().toISOString()
  const bulkTiersJson = data.bulkTiers ? JSON.stringify(data.bulkTiers) : null
  const row = await prisma.vendorGemListing.upsert({
    where: { vendorId },
    create: {
      vendorId,
      pricePerK: data.pricePerK,
      minOrderK: data.minOrderK ?? 1,
      maxOrderK: data.maxOrderK ?? 500,
      stockK: 0,
      bulkTiers: bulkTiersJson,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      pricePerK: data.pricePerK,
      ...(data.minOrderK !== undefined ? { minOrderK: data.minOrderK } : {}),
      ...(data.maxOrderK !== undefined ? { maxOrderK: data.maxOrderK } : {}),
      ...(data.bulkTiers !== undefined ? { bulkTiers: bulkTiersJson } : {}),
      updatedAt: now,
    },
  })
  return toVendorGemListing(row)
}

export async function deleteVendorListing(vendorId: string): Promise<boolean> {
  try {
    await prisma.vendorGemListing.delete({ where: { vendorId } })
    // Also fail any pending deposits
    await prisma.vendorDeposit.updateMany({
      where: { vendorId, status: { in: ['pending', 'queued'] } },
      data: { status: 'failed', updatedAt: new Date().toISOString() },
    })
    return true
  } catch {
    return false
  }
}

export async function updateVendorPlatformFeeRate(vendorId: string, rate: number | null): Promise<VendorGemListing | null> {
  try {
    const row = await prisma.vendorGemListing.update({
      where: { vendorId },
      data: { platformFeeRate: rate, updatedAt: new Date().toISOString() },
    })
    return toVendorGemListing(row)
  } catch {
    return null
  }
}

export async function updateVendorListingActive(vendorId: string, active: boolean): Promise<VendorGemListing | null> {
  try {
    const row = await prisma.vendorGemListing.update({
      where: { vendorId },
      data: { active, updatedAt: new Date().toISOString() },
    })
    return toVendorGemListing(row)
  } catch {
    return null
  }
}

export async function addVendorStock(vendorId: string, amountK: number): Promise<VendorGemListing | null> {
  if (!Number.isFinite(amountK) || amountK <= 0) return null
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const locked: Array<{ stockK: number }> = await tx.$queryRawUnsafe(
      'SELECT "stockK" FROM "VendorGemListing" WHERE "vendorId" = $1 FOR UPDATE', vendorId
    )
    if (!locked.length) return null
    const newStock = locked[0].stockK + amountK
    const row = await tx.vendorGemListing.update({
      where: { vendorId },
      data: { stockK: newStock, updatedAt: new Date().toISOString() },
    })
    return toVendorGemListing(row)
  })
}

export async function deductVendorStock(vendorId: string, amountK: number): Promise<boolean> {
  if (!Number.isFinite(amountK) || amountK <= 0) return false
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const locked: Array<{ stockK: number }> = await tx.$queryRawUnsafe(
      'SELECT "stockK" FROM "VendorGemListing" WHERE "vendorId" = $1 FOR UPDATE', vendorId
    )
    if (!locked.length || locked[0].stockK < amountK) return false
    await tx.vendorGemListing.update({
      where: { vendorId },
      data: { stockK: locked[0].stockK - amountK, updatedAt: new Date().toISOString() },
    })
    return true
  })
}

// Vendor deposits
export interface VendorDeposit {
  id: string
  vendorId: string
  amountK: number
  status: 'pending' | 'queued' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

function toVendorDeposit(row: {
  id: string
  vendorId: string
  amountK: number
  status: string
  createdAt: string
  updatedAt: string
}): VendorDeposit {
  return {
    id: row.id,
    vendorId: row.vendorId,
    amountK: row.amountK,
    status: row.status as VendorDeposit['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function createVendorDeposit(vendorId: string, amountK: number): Promise<VendorDeposit> {
  const now = new Date().toISOString()
  const row = await prisma.vendorDeposit.create({
    data: { vendorId, amountK, status: 'pending', createdAt: now, updatedAt: now },
  })
  return toVendorDeposit(row)
}

export async function getVendorDeposit(depositId: string): Promise<VendorDeposit | null> {
  try {
    const row = await prisma.vendorDeposit.findUnique({ where: { id: depositId } })
    return row ? toVendorDeposit(row) : null
  } catch {
    return null
  }
}

export async function getVendorDeposits(vendorId: string): Promise<VendorDeposit[]> {
  const rows = await prisma.vendorDeposit.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toVendorDeposit)
}

export async function updateVendorDepositStatus(
  depositId: string,
  status: VendorDeposit['status']
): Promise<VendorDeposit | null> {
  try {
    const row = await prisma.vendorDeposit.update({
      where: { id: depositId },
      data: { status, updatedAt: new Date().toISOString() },
    })
    return toVendorDeposit(row)
  } catch {
    return null
  }
}

/**
 * Atomically claim a vendor deposit for stock crediting.
 * Only transitions from pending/queued → completed.
 * Returns the deposit if claimed, null if already claimed by another process.
 * This prevents double-credit when multiple endpoints try to credit the same deposit.
 */
export async function claimVendorDeposit(depositId: string): Promise<VendorDeposit | null> {
  const result = await prisma.vendorDeposit.updateMany({
    where: { id: depositId, status: { in: ['pending', 'queued'] as never[] } },
    data: { status: 'completed' as never, updatedAt: new Date().toISOString() },
  })
  if (result.count === 0) return null
  return getVendorDeposit(depositId)
}

export async function getPendingVendorDeposits(): Promise<(VendorDeposit & { vendorName: string })[]> {
  const rows = await prisma.vendorDeposit.findMany({
    where: { status: { in: ['pending', 'queued'] } },
    include: { vendor: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(row => ({
    ...toVendorDeposit(row),
    vendorName: row.vendor.name,
  }))
}

// Vendor earnings
export interface VendorEarningRecord {
  id: string
  vendorId: string
  orderId: string
  saleAmount: number
  platformFee: number
  netAmount: number
  createdAt: string
}

function toVendorEarning(row: {
  id: string
  vendorId: string
  orderId: string
  saleAmount: Decimal
  platformFee: Decimal
  netAmount: Decimal
  createdAt: string
}): VendorEarningRecord {
  return {
    id: row.id,
    vendorId: row.vendorId,
    orderId: row.orderId,
    saleAmount: d(row.saleAmount),
    platformFee: d(row.platformFee),
    netAmount: d(row.netAmount),
    createdAt: row.createdAt,
  }
}

export async function createVendorEarning(
  vendorId: string,
  orderId: string,
  saleAmount: number
): Promise<VendorEarningRecord> {
  // Effective fee: manual override (platformFeeRate) > auto volume tier
  // (autoFeeRate) > default 3%. See lib/vendor-fees.ts.
  const listing = await prisma.vendorGemListing.findUnique({
    where: { vendorId },
    select: { platformFeeRate: true, autoFeeRate: true },
  })
  const feeRate = effectiveFeeRate(listing)
  const platformFee = Math.round(saleAmount * feeRate * 100) / 100
  const netAmount = Math.round((saleAmount - platformFee) * 100) / 100
  const now = new Date().toISOString()
  const row = await prisma.vendorEarning.create({
    data: { vendorId, orderId, saleAmount, platformFee, netAmount, createdAt: now },
  })
  // Credit vendor wallet (also writes vendor_earning ledger row inside the same TX)
  const credited = await addToWallet(vendorId, netAmount, {
    type: 'vendor_earning',
    description: `Vendor sale: net $${netAmount.toFixed(2)} (gross $${saleAmount.toFixed(2)} - $${platformFee.toFixed(2)} fee)`,
    relatedId: orderId,
  })
  if (!credited) {
    console.error(`CRITICAL: Vendor wallet credit failed for ${vendorId}, amount $${netAmount}. Wallet at max.`)
  }
  // This vendor just sold — recompute their volume tier so a 650k/wk crossing
  // grants the 1.5% break immediately on their next sale. Best-effort: a tier
  // recompute failure must never break the sale itself.
  try {
    await recomputeVendorTier(vendorId)
  } catch (e) {
    console.error(`[fee-tiers] post-sale recompute failed for ${vendorId}:`, e)
  }
  return toVendorEarning(row)
}

export async function getVendorEarnings(vendorId: string): Promise<VendorEarningRecord[]> {
  const rows = await prisma.vendorEarning.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toVendorEarning)
}

export async function getVendorEarningsSummary(vendorId: string): Promise<{
  totalSales: number
  totalFees: number
  totalNet: number
  count: number
}> {
  const earnings = await getVendorEarnings(vendorId)
  return {
    totalSales: earnings.reduce((sum, e) => sum + e.saleAmount, 0),
    totalFees: earnings.reduce((sum, e) => sum + e.platformFee, 0),
    totalNet: earnings.reduce((sum, e) => sum + e.netAmount, 0),
    count: earnings.length,
  }
}

export async function getOrderStats() {
  const orders = await getOrders()
  const now = new Date()
  // Use PST for "today" boundary
  const pstParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const pstY = +pstParts.find(p => p.type === 'year')!.value
  const pstM = +pstParts.find(p => p.type === 'month')!.value - 1
  const pstD = +pstParts.find(p => p.type === 'day')!.value
  const pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const utcOff = now.getTime() - pstNow.getTime()
  const today = new Date(new Date(pstY, pstM, pstD).getTime() + utcOff)
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(new Date(pstY, pstM, 1).getTime() + utcOff)

  return {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'processing').length,
    totalRevenue: orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalPrice, 0),
    todayOrders: orders.filter(o => new Date(o.createdAt) >= today).length,
    weekOrders: orders.filter(o => new Date(o.createdAt) >= thisWeek).length,
    monthOrders: orders.filter(o => new Date(o.createdAt) >= thisMonth).length,
  }
}

// ─── Transaction Ledger ──────────────────────────────────────────────────────

export type LedgerType = 'deposit' | 'purchase' | 'vendor_earning' | 'vendor_payout' | 'refund' | 'referral_commission' | 'admin_adjust'

export interface LedgerEntry {
  id: string
  type: LedgerType
  userId: string
  amount: number
  description: string
  relatedId?: string
  createdAt: string
}

export async function createLedgerEntry(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<void> {
  const now = new Date().toISOString()
  await prisma.transactionLedger.create({
    data: {
      type: entry.type as any,
      userId: entry.userId,
      amount: entry.amount,
      description: entry.description,
      relatedId: entry.relatedId,
      createdAt: now,
    },
  })
}

export async function getLedgerEntries(opts?: {
  userId?: string
  type?: LedgerType
  since?: string
  limit?: number
}): Promise<LedgerEntry[]> {
  const where: any = {}
  if (opts?.userId) where.userId = opts.userId
  if (opts?.type) where.type = opts.type
  if (opts?.since) where.createdAt = { gte: opts.since }

  const rows = await prisma.transactionLedger.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 100,
  })

  return rows.map(row => ({
    id: row.id,
    type: row.type as LedgerType,
    userId: row.userId,
    amount: d(row.amount),
    description: row.description,
    relatedId: row.relatedId ?? undefined,
    createdAt: row.createdAt,
  }))
}

// ─── Finance Stats ───────────────────────────────────────────────────────────

export interface FinanceStats {
  totalDeposits: number
  totalProcessingFees: number
  totalPlatformFees: number
  totalVendorEarnings: number
  vendorPayoutsOwed: number
  pendingPayoutCount: number
  netRevenue: number
  orderCount: number
  depositCount: number
}

export async function getFinanceStats(period?: 'today' | 'week' | 'month' | 'all'): Promise<FinanceStats> {
  let since: string | undefined
  const now = new Date()
  if (period === 'today') {
    // Use PST midnight, not UTC
    const pst = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now)
    const y = +pst.find(p => p.type === 'year')!.value
    const m = +pst.find(p => p.type === 'month')!.value - 1
    const dd = +pst.find(p => p.type === 'day')!.value
    const pstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    const utcOffset = now.getTime() - pstNow.getTime()
    since = new Date(new Date(y, m, dd).getTime() + utcOffset).toISOString()
  } else if (period === 'week') {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  } else if (period === 'month') {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  const depositWhere: any = { status: 'completed' }
  const earningWhere: any = {}
  const orderWhere: any = { status: 'completed' }
  if (since) {
    depositWhere.completedAt = { gte: since }
    earningWhere.createdAt = { gte: since }
    orderWhere.createdAt = { gte: since }
  }

  const [depositAgg, earningAgg, orderCount, vendorBalances, pendingPayouts] = await Promise.all([
    prisma.deposit.aggregate({
      where: depositWhere,
      _sum: { amount: true, processingFee: true },
      _count: true,
    }),
    prisma.vendorEarning.aggregate({
      where: earningWhere,
      _sum: { platformFee: true, netAmount: true },
    }),
    prisma.order.count({ where: orderWhere }),
    prisma.user.aggregate({
      where: { isVendor: true },
      _sum: { walletBalance: true },
    }),
    prisma.vendorPayout.count({ where: { status: 'pending' } }),
  ])

  const totalDeposits = d(depositAgg._sum.amount ?? 0)
  const totalProcessingFees = d(depositAgg._sum.processingFee ?? 0)
  const totalPlatformFees = d(earningAgg._sum.platformFee ?? 0)
  const totalVendorEarnings = d(earningAgg._sum.netAmount ?? 0)
  const vendorPayoutsOwed = d(vendorBalances._sum.walletBalance ?? 0)

  return {
    totalDeposits,
    totalProcessingFees,
    totalPlatformFees,
    totalVendorEarnings,
    vendorPayoutsOwed,
    pendingPayoutCount: pendingPayouts,
    netRevenue: Math.round((totalProcessingFees + totalPlatformFees) * 100) / 100,
    orderCount,
    depositCount: depositAgg._count,
  }
}

// ─── Vendor Payouts ──────────────────────────────────────────────────────────

export interface VendorPayout {
  id: string
  vendorId: string
  amount: number
  paymentMethod: string
  status: 'pending' | 'completed' | 'rejected'
  adminNotes?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export async function createVendorPayout(
  vendorId: string,
  amount: number,
  paymentMethod: string
): Promise<VendorPayout | null> {
  const now = new Date().toISOString()

  return prisma.$transaction(async (tx) => {
    // Lock the user row to prevent race conditions
    const rows = await tx.$queryRawUnsafe<{ walletBalance: Decimal }[]>(
      'SELECT "walletBalance" FROM "User" WHERE id = $1 FOR UPDATE',
      vendorId
    )
    if (!rows.length) return null

    const balance = d(rows[0].walletBalance)
    if (balance < amount) return null

    const payout = await tx.vendorPayout.create({
      data: {
        vendorId,
        amount,
        paymentMethod,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
    })

    // Ledger entry FIRST so the audit row is in place
    await tx.transactionLedger.create({
      data: {
        type: 'vendor_payout',
        userId: vendorId,
        amount,
        description: `Payout request: ${paymentMethod}`,
        relatedId: payout.id,
        createdAt: now,
      },
    })
    // Then permission token + actual wallet UPDATE
    await allowWalletChange(tx)
    await tx.user.update({
      where: { id: vendorId },
      data: { walletBalance: Math.round((balance - amount) * 100) / 100 },
    })

    return {
      id: payout.id,
      vendorId: payout.vendorId,
      amount: d(payout.amount),
      paymentMethod: payout.paymentMethod,
      status: payout.status as 'pending',
      adminNotes: payout.adminNotes ?? undefined,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
      completedAt: payout.completedAt ?? undefined,
    }
  })
}

export interface AdminInitiatedPayoutInput {
  vendorId: string
  adminId: string
  adminName: string
  amount: number
  paymentMethod: string
  reference: string
  notes: string
}

export interface AdminInitiatedPayoutResult {
  payout: VendorPayout
  previousBalance: number
  newBalance: number
}

export async function createAdminInitiatedPayout(
  input: AdminInitiatedPayoutInput
): Promise<AdminInitiatedPayoutResult | { error: 'insufficient'; currentBalance: number } | null> {
  const { vendorId, adminId, adminName, amount, paymentMethod, reference, notes } = input
  const now = new Date().toISOString()
  const rounded = Math.round(amount * 100) / 100

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ walletBalance: Decimal }[]>(
      'SELECT "walletBalance" FROM "User" WHERE id = $1 FOR UPDATE',
      vendorId
    )
    if (!rows.length) return null

    const previousBalance = Math.round(d(rows[0].walletBalance) * 100) / 100
    if (previousBalance < rounded) {
      return { error: 'insufficient' as const, currentBalance: previousBalance }
    }

    const newBalance = Math.round((previousBalance - rounded) * 100) / 100
    const adminNotes = `${reference ? `ref=${reference} | ` : ''}${notes} | by admin ${adminName}(${adminId})`.slice(0, 500)

    const payout = await tx.vendorPayout.create({
      data: {
        vendorId,
        amount: rounded,
        paymentMethod,
        status: 'completed',
        adminNotes,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      },
    })

    // Ledger BEFORE wallet update so the audit row exists when the trigger fires
    await tx.transactionLedger.create({
      data: {
        type: 'vendor_payout',
        userId: vendorId,
        amount: rounded,
        description: `Admin payout: ${paymentMethod}${reference ? ` (${reference})` : ''} by ${adminName}`,
        relatedId: payout.id,
        createdAt: now,
      },
    })
    await allowWalletChange(tx)
    await tx.user.update({
      where: { id: vendorId },
      data: { walletBalance: newBalance },
    })

    return {
      payout: {
        id: payout.id,
        vendorId: payout.vendorId,
        amount: d(payout.amount),
        paymentMethod: payout.paymentMethod,
        status: 'completed',
        adminNotes: payout.adminNotes ?? undefined,
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt,
        completedAt: payout.completedAt ?? undefined,
      },
      previousBalance,
      newBalance,
    }
  })
}

export async function getVendorPayouts(vendorId?: string): Promise<VendorPayout[]> {
  const where: any = {}
  if (vendorId) where.vendorId = vendorId

  const rows = await prisma.vendorPayout.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return rows.map(row => ({
    id: row.id,
    vendorId: row.vendorId,
    amount: d(row.amount),
    paymentMethod: row.paymentMethod,
    status: row.status as 'pending' | 'completed' | 'rejected',
    adminNotes: row.adminNotes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? undefined,
  }))
}

export async function getPendingPayouts(): Promise<(VendorPayout & { vendorName: string })[]> {
  const rows = await prisma.vendorPayout.findMany({
    where: { status: 'pending' },
    include: { vendor: { select: { displayName: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return rows.map(row => ({
    id: row.id,
    vendorId: row.vendorId,
    amount: d(row.amount),
    paymentMethod: row.paymentMethod,
    status: row.status as 'pending',
    adminNotes: row.adminNotes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? undefined,
    vendorName: row.vendor.displayName,
  }))
}

export async function completeVendorPayout(id: string, adminNotes?: string): Promise<boolean> {
  const now = new Date().toISOString()
  const result = await prisma.vendorPayout.updateMany({
    where: { id, status: 'pending' },
    data: { status: 'completed', adminNotes, updatedAt: now, completedAt: now },
  })
  return result.count === 1
}

export async function rejectVendorPayout(id: string, adminNotes?: string): Promise<boolean> {
  const now = new Date().toISOString()

  return prisma.$transaction(async (tx) => {
    const payout = await tx.vendorPayout.findFirst({ where: { id, status: 'pending' } })
    if (!payout) return false

    await tx.vendorPayout.update({
      where: { id },
      data: { status: 'rejected', adminNotes, updatedAt: now },
    })

    // Refund the vendor's wallet
    const rows = await tx.$queryRawUnsafe<{ walletBalance: Decimal }[]>(
      'SELECT "walletBalance" FROM "User" WHERE id = $1 FOR UPDATE',
      payout.vendorId
    )
    if (rows.length) {
      // Ledger BEFORE wallet update (trigger order)
      await tx.transactionLedger.create({
        data: {
          type: 'refund',
          userId: payout.vendorId,
          amount: d(payout.amount),
          description: `Payout rejected${adminNotes ? ': ' + adminNotes : ''}`,
          relatedId: id,
          createdAt: now,
        },
      })
      await allowWalletChange(tx)
      const newBalance = d(rows[0].walletBalance) + d(payout.amount)
      await tx.user.update({
        where: { id: payout.vendorId },
        data: { walletBalance: Math.round(newBalance * 100) / 100 },
      })
    }

    return true
  })
}
