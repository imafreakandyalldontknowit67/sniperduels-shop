/**
 * Marketplace operations — atomic transitions across Order, VaultItem,
 * VendorItemListing, and ItemDeliveryJob.
 *
 * All exports here are SAFE TO RE-CALL. Idempotent on Order.id where it
 * matters (Pandabase webhook retries, user double-clicks, etc.).
 */
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/lib/generated/prisma/client'

// DB has a guard trigger on User.walletBalance — direct updates fail unless
// the session variable is set in the same transaction. lib/storage.ts uses
// the same helper for deposit/withdraw flows.
async function allowWalletChange(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRawUnsafe(`SET LOCAL app.allow_wallet_change = 'true'`)
}

export type PaymentMethod = 'wallet' | 'pandabase'

export interface PurchaseInput {
  listingId: string
  buyerId: string
  buyerRobloxName: string
  method: PaymentMethod
}

export interface PurchaseResult {
  orderId: string
  deliveryJobId: string
  status: 'wallet_paid' | 'pandabase_pending'
  totalPriceUsd: number
}

/**
 * Reserve a listing for a buyer and create the matching Order + delivery job.
 *
 * For `method='wallet'`: deducts wallet balance and immediately seeds a
 * queued ItemDeliveryJob (bot picks up on next poll).
 *
 * For `method='pandabase'`: creates a pending Order; caller should hand the
 * Order to the Pandabase invoice creator. The delivery job is also seeded
 * (status=queued) but the BOT POLL FILTERS to deliveries whose Order is
 * `processing`/`completed`. So the bot won't pick up a delivery whose
 * payment hasn't cleared.
 *
 * Atomicity: all writes happen in one Postgres transaction. Vault item
 * status flips to 'reserved' so concurrent buyers see it as unavailable.
 */
export async function purchaseListing(input: PurchaseInput): Promise<PurchaseResult> {
  return prisma.$transaction(async tx => {
    const listing = await tx.vendorItemListing.findUnique({
      where: { id: input.listingId },
      include: { vaultItem: { include: { owner: true } } },
    })
    if (!listing) throw new MarketplaceError('LISTING_NOT_FOUND', 'Listing not found')
    if (!listing.active) throw new MarketplaceError('LISTING_INACTIVE', 'Listing inactive')
    if (listing.vaultItem.status !== 'listed') {
      throw new MarketplaceError('LISTING_UNAVAILABLE',
        `Item status is ${listing.vaultItem.status} (expected 'listed')`)
    }
    if (listing.vaultItem.ownerId === input.buyerId) {
      throw new MarketplaceError('SELF_PURCHASE', 'Cannot buy your own listing')
    }

    const totalPriceUsd = Number(listing.priceUsd)
    if (!Number.isFinite(totalPriceUsd) || totalPriceUsd <= 0) {
      throw new MarketplaceError('INVALID_PRICE', 'Listing price is invalid')
    }

    // Look up the buyer's name for the Order row
    const buyer = await tx.user.findUnique({ where: { id: input.buyerId } })
    if (!buyer) throw new MarketplaceError('BUYER_NOT_FOUND', 'Buyer not found')

    const nowIso = new Date().toISOString()

    // Wallet path: deduct synchronously.
    let orderStatus: 'pending' | 'processing' = 'pending'
    if (input.method === 'wallet') {
      const balance = Number(buyer.walletBalance)
      if (balance < totalPriceUsd) {
        throw new MarketplaceError('INSUFFICIENT_BALANCE',
          `Wallet balance $${balance.toFixed(2)} < listing $${totalPriceUsd.toFixed(2)}`)
      }
      const newBalance = Math.round((balance - totalPriceUsd) * 100) / 100
      // Ledger row FIRST then SET LOCAL then UPDATE — matches lib/storage.ts pattern.
      await tx.transactionLedger.create({
        data: {
          type: 'purchase',
          userId: input.buyerId,
          amount: Math.round(totalPriceUsd * 100) / 100,
          description: `Item purchase: listing ${listing.id}`,
          relatedId: listing.id,
          createdAt: nowIso,
        },
      })
      await allowWalletChange(tx)
      await tx.user.update({
        where: { id: input.buyerId },
        data: { walletBalance: newBalance },
      })
      orderStatus = 'processing'  // payment cleared; bot can deliver
    }

    // Lock the vault item so concurrent buys + the seller's withdraw all see it
    await tx.vaultItem.update({
      where: { id: listing.vaultItemId },
      data: { status: 'reserved' },
    })

    // Create the Order. itemName mirrors the catalog name for display.
    const order = await tx.order.create({
      data: {
        userId: input.buyerId,
        userName: buyer.name,
        type: 'item',
        itemName: listing.vaultItem.catalogId, // catalog ID for join; display uses include
        quantity: 1,
        pricePerUnit: totalPriceUsd,
        totalPrice: totalPriceUsd,
        status: orderStatus,
        vaultListingId: listing.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    })

    // Create the delivery job — bot picks up via /api/bot/v1/jobs/next.
    const delivery = await tx.itemDeliveryJob.create({
      data: {
        vaultItemId: listing.vaultItemId,
        orderId: order.id,
        buyerUserId: input.buyerId,
        buyerRobloxName: input.buyerRobloxName,
        expectedFingerprint: listing.vaultItem.fingerprint ?? {},
      },
    })

    return {
      orderId: order.id,
      deliveryJobId: delivery.id,
      status: input.method === 'wallet' ? 'wallet_paid' : 'pandabase_pending',
      totalPriceUsd,
    }
  })
}

/**
 * Refund a failed item delivery. Restores the buyer's wallet, unlocks the
 * VaultItem back to 'listed' (so seller can re-sell or withdraw), marks
 * Order failed.
 *
 * Idempotent on Order.id — if already refunded, returns the existing state.
 */
export async function refundListingPurchase(orderId: string, reason: string) {
  return prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) throw new MarketplaceError('ORDER_NOT_FOUND', 'Order not found')
    if (order.type !== 'item') throw new MarketplaceError('NOT_ITEM_ORDER', 'Order is not an item order')
    if (order.status === 'refunded' || order.status === 'failed') {
      return { alreadyRefunded: true, order }
    }

    const delivery = await tx.itemDeliveryJob.findUnique({ where: { orderId } })
    if (delivery) {
      await tx.itemDeliveryJob.update({
        where: { id: delivery.id },
        data: { status: 'failed', lastError: reason, completedAt: new Date() },
      })
      // Unlock the vault item — listing returns to active.
      await tx.vaultItem.update({
        where: { id: delivery.vaultItemId },
        data: { status: 'listed' },
      })
    }

    // Credit wallet back ONLY if it was a wallet purchase. Pandabase refunds
    // go through Pandabase's own refund flow (handled elsewhere).
    const totalPriceUsd = Number(order.totalPrice)
    const wasWalletPurchase = await tx.transactionLedger.findFirst({
      where: { type: 'purchase', relatedId: order.vaultListingId ?? undefined, userId: order.userId },
    })
    if (wasWalletPurchase) {
      const buyer = await tx.user.findUnique({ where: { id: order.userId } })
      if (buyer) {
        const newBalance = Math.round((Number(buyer.walletBalance) + totalPriceUsd) * 100) / 100
        await tx.transactionLedger.create({
          data: {
            type: 'refund',
            userId: order.userId,
            amount: totalPriceUsd,
            description: `Refund: ${reason}`,
            relatedId: order.id,
            createdAt: new Date().toISOString(),
          },
        })
        await allowWalletChange(tx)
        await tx.user.update({
          where: { id: order.userId },
          data: { walletBalance: newBalance },
        })
      }
    }

    const nowIso = new Date().toISOString()
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'refunded',
        notes: reason,
        updatedAt: nowIso,
      },
    })
    return { alreadyRefunded: false, order: updated }
  })
}

/**
 * Coding error class — distinguishes business-rule failures from system
 * errors. Routes should map these to 4xx; everything else to 5xx.
 */
export class MarketplaceError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'MarketplaceError'
  }
}

// ─────────────────────── Fingerprint validation ───────────────────────────
// Hardening 9.10: VaultItem.fingerprint is a Prisma JSON column — without a
// guard, any shape can land in it. The bot relies on a specific subset for
// trade-time matching. Validate on write paths so malformed fingerprints
// crash early instead of failing silently in `fingerprint_matches`.

export interface ItemFingerprint {
  rarity?: string | null
  condition?: string | null
  fragtrakr?: boolean
  fx?: string | null
  kills?: number | null
  quickscope_kills?: number | null
  crate?: string | null
  exist?: number | null
}

export function isValidFingerprint(x: unknown): x is ItemFingerprint {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false
  const o = x as Record<string, unknown>
  const strOrNull = (v: unknown) => v === undefined || v === null || typeof v === 'string'
  const intOrNull = (v: unknown) =>
    v === undefined || v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0)
  return (
    strOrNull(o.rarity) &&
    strOrNull(o.condition) &&
    (o.fragtrakr === undefined || typeof o.fragtrakr === 'boolean') &&
    strOrNull(o.fx) &&
    intOrNull(o.kills) &&
    intOrNull(o.quickscope_kills) &&
    strOrNull(o.crate) &&
    intOrNull(o.exist)
  )
}

export function assertValidFingerprint(x: unknown, where: string): asserts x is ItemFingerprint {
  if (!isValidFingerprint(x)) {
    throw new MarketplaceError(
      'INVALID_FINGERPRINT',
      `Invalid fingerprint shape at ${where}: ${JSON.stringify(x).slice(0, 200)}`,
    )
  }
}
