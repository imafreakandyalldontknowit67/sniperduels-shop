import { prisma } from './prisma'
import { Prisma } from './generated/prisma/client'

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
  createdAt: string
  lastLogin: string
  isAdmin: boolean
  isVendor: boolean
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
  createdAt: string
  lastLogin: string
  isAdmin: boolean
  isVendor: boolean
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
    createdAt: row.createdAt,
    lastLogin: row.lastLogin,
    isAdmin: row.isAdmin,
    isVendor: row.isVendor,
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
  user: Omit<StoredUser, 'createdAt' | 'lastLogin' | 'walletBalance' | 'lifetimeSpend' | 'discordFirstPurchaseUsed' | 'isVendor'> & { isAdmin?: boolean }
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
  } catch {
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
  } catch {
    return null
  }
}

// ─── Wallet functions ────────────────────────────────────────────────────────

const MAX_WALLET_BALANCE = 100_000

export async function getWalletBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } })
  return user ? d(user.walletBalance) : 0
}

export async function updateWalletBalance(userId: string, amount: number): Promise<StoredUser | null> {
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_WALLET_BALANCE) return null

  try {
    const row = await prisma.user.update({
      where: { id: userId },
      data: { walletBalance: amount },
    })
    return toStoredUser(row)
  } catch {
    return null
  }
}

export async function addToWallet(userId: string, amount: number): Promise<StoredUser | null> {
  if (!Number.isFinite(amount) || amount < 0) return null

  // Use a transaction for atomicity
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) return null

    const currentBalance = d(user.walletBalance)
    const newBalance = currentBalance + amount
    if (newBalance > MAX_WALLET_BALANCE) return null

    const row = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: newBalance },
    })
    return toStoredUser(row)
  })
}

export async function deductFromWallet(userId: string, amount: number): Promise<StoredUser | null> {
  if (!Number.isFinite(amount) || amount < 0) return null

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Lock the user row to prevent concurrent balance reads (race condition fix)
    const locked: Array<{ walletBalance: number }> = await tx.$queryRawUnsafe(
      'SELECT "walletBalance" FROM "User" WHERE id = $1 FOR UPDATE', userId
    )
    if (!locked.length) return null

    const currentBalance = d(locked[0].walletBalance)
    if (currentBalance < amount) return null

    const row = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: currentBalance - amount },
    })
    return toStoredUser(row)
  })
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
  status: DepositStatus
  pandabaseInvoiceId: string
  pandabaseRefId?: string
  pandabaseCheckoutUrl: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

function toDeposit(row: {
  id: string
  userId: string
  amount: Decimal
  status: string
  pandabaseInvoiceId: string
  pandabaseRefId: string | null
  pandabaseCheckoutUrl: string
  createdAt: string
  updatedAt: string
  completedAt: string | null
}): Deposit {
  return {
    id: row.id,
    userId: row.userId,
    amount: d(row.amount),
    status: row.status as DepositStatus,
    pandabaseInvoiceId: row.pandabaseInvoiceId,
    pandabaseRefId: row.pandabaseRefId ?? undefined,
    pandabaseCheckoutUrl: row.pandabaseCheckoutUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt ?? undefined,
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
      status: deposit.status,
      pandabaseInvoiceId: deposit.pandabaseInvoiceId,
      pandabaseRefId: deposit.pandabaseRefId,
      pandabaseCheckoutUrl: deposit.pandabaseCheckoutUrl,
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
  const row = await prisma.gemStock.findUnique({ where: { id: 'singleton' } })
  const current = row?.balanceInK ?? 0
  const newBalance = current + amountInK
  await prisma.gemStock.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', balanceInK: newBalance, updatedAt: new Date().toISOString() },
    update: { balanceInK: newBalance, updatedAt: new Date().toISOString() },
  })
  return newBalance
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
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const listing = await tx.vendorGemListing.findUnique({ where: { vendorId } })
    if (!listing) return null
    const row = await tx.vendorGemListing.update({
      where: { vendorId },
      data: { stockK: listing.stockK + amountK, updatedAt: new Date().toISOString() },
    })
    return toVendorGemListing(row)
  })
}

export async function deductVendorStock(vendorId: string, amountK: number): Promise<boolean> {
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

const PLATFORM_FEE_RATE = 0.05 // 5%

export async function createVendorEarning(
  vendorId: string,
  orderId: string,
  saleAmount: number
): Promise<VendorEarningRecord> {
  const platformFee = Math.round(saleAmount * PLATFORM_FEE_RATE * 100) / 100
  const netAmount = Math.round((saleAmount - platformFee) * 100) / 100
  const now = new Date().toISOString()
  const row = await prisma.vendorEarning.create({
    data: { vendorId, orderId, saleAmount, platformFee, netAmount, createdAt: now },
  })
  // Credit vendor wallet
  await addToWallet(vendorId, netAmount)
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
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

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
