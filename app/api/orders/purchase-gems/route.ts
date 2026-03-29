import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  deductFromWallet,
  addToWallet,
  createOrder,
  getUserLoyaltyInfo,
  addToLifetimeSpend,
  getWalletBalance,
  canUseDiscordFirstPurchaseDiscount,
  markDiscordFirstPurchaseUsed,
  getGemStock,
  deductGemStock,
  getVendorListing,
  deductVendorStock,
  createVendorEarning,
  createLedgerEntry,
} from '@/lib/storage'
import { notifyPurchase } from '@/lib/discord-webhook'
import { getBotLastHeartbeat } from '@/lib/bot-heartbeat'

const PRICING_TIERS = [
  { min: 1, max: 99, rate: 2.90 },
  { min: 100, max: 500, rate: 2.65 },
]

function getRate(amountInK: number): number {
  const tier = PRICING_TIERS.find(t => amountInK >= t.min && amountInK <= t.max)
  return tier?.rate ?? PRICING_TIERS[0].rate
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lastHeartbeat = getBotLastHeartbeat()
    if (Date.now() - lastHeartbeat > 60_000) {
      return NextResponse.json(
        { error: 'The trade bot is currently offline. Please try again later.' },
        { status: 503 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { amountInK, vendorListingId } = body

    if (!amountInK || typeof amountInK !== 'number' || !Number.isInteger(amountInK) || amountInK < 5 || amountInK > 500) {
      return NextResponse.json(
        { error: 'amountInK must be an integer between 5 and 500' },
        { status: 400 }
      )
    }

    const roundedAmount = amountInK

    // Determine source: vendor or platform
    let rate: number
    let vendorId: string | null = null
    let isVendorPurchase = false

    if (vendorListingId && vendorListingId !== 'platform') {
      // Vendor purchase
      const listing = await getVendorListing(vendorListingId)
      if (!listing || !listing.active) {
        return NextResponse.json({ error: 'Vendor listing not found or inactive' }, { status: 404 })
      }
      if (listing.stockK < roundedAmount) {
        return NextResponse.json(
          { error: 'Not enough vendor stock', available: listing.stockK, requested: roundedAmount },
          { status: 400 }
        )
      }
      if (roundedAmount < listing.minOrderK || roundedAmount > listing.maxOrderK) {
        return NextResponse.json(
          { error: `Order must be between ${listing.minOrderK}k and ${listing.maxOrderK}k for this vendor` },
          { status: 400 }
        )
      }

      // Check vendor bulk tiers
      rate = listing.pricePerK
      if (listing.bulkTiers && listing.bulkTiers.length > 0) {
        const sortedTiers = [...listing.bulkTiers].sort((a, b) => b.minK - a.minK)
        const applicableTier = sortedTiers.find(t => roundedAmount >= t.minK)
        if (applicableTier) {
          rate = applicableTier.pricePerK
        }
      }

      vendorId = listing.vendorId
      isVendorPurchase = true
    } else {
      // Platform purchase
      const gemStock = await getGemStock()
      if (gemStock < roundedAmount) {
        return NextResponse.json(
          { error: 'Not enough gems in stock', available: gemStock, requested: roundedAmount },
          { status: 400 }
        )
      }
      rate = getRate(roundedAmount)
    }

    // Calculate price with loyalty + discord discounts
    const loyalty = await getUserLoyaltyInfo(user.id)
    const discordEligible = await canUseDiscordFirstPurchaseDiscount(user.id)
    const combinedDiscount = loyalty.discount + (discordEligible ? 0.01 : 0)
    const basePrice = roundedAmount * rate
    const totalPrice = Math.round(basePrice * (1 - combinedDiscount) * 100) / 100

    // Check wallet balance
    const balance = await getWalletBalance(user.id)
    if (balance < totalPrice) {
      return NextResponse.json(
        { error: 'Insufficient wallet balance', balance, required: totalPrice },
        { status: 400 }
      )
    }

    // Deduct balance
    const deductResult = await deductFromWallet(user.id, totalPrice)
    if (!deductResult) {
      return NextResponse.json({ error: 'Failed to deduct wallet balance' }, { status: 500 })
    }

    // Deduct stock from appropriate source
    if (isVendorPurchase && vendorId) {
      const deducted = await deductVendorStock(vendorId, roundedAmount)
      if (!deducted) {
        const refunded = await addToWallet(user.id, totalPrice)
        if (!refunded) {
          console.error(`CRITICAL: Refund failed for user ${user.id}, amount $${totalPrice}. Wallet at max.`)
          return NextResponse.json(
            { error: 'Vendor stock went out. Refund could not be processed - contact support.' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: 'Vendor stock went out. Wallet refunded.' },
          { status: 409 }
        )
      }
    } else {
      const deducted = await deductGemStock(roundedAmount)
      if (!deducted) {
        const refunded = await addToWallet(user.id, totalPrice)
        if (!refunded) {
          console.error(`CRITICAL: Refund failed for user ${user.id}, amount $${totalPrice}. Wallet at max.`)
          return NextResponse.json(
            { error: 'Gems went out of stock. Refund could not be processed - contact support.' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: 'Gems went out of stock. Wallet refunded.' },
          { status: 409 }
        )
      }
    }

    // Create gems order
    const order = await createOrder({
      userId: user.id,
      userName: user.name,
      type: 'gems',
      itemName: `${roundedAmount}k Gems`,
      quantity: roundedAmount,
      pricePerUnit: rate,
      totalPrice,
      status: 'pending',
      vendorListingId: isVendorPurchase ? vendorListingId : undefined,
    })

    // Track lifetime spend + consume discord first-purchase bonus
    await addToLifetimeSpend(user.id, totalPrice)
    if (discordEligible) {
      await markDiscordFirstPurchaseUsed(user.id)
    }

    // Log purchase to ledger
    await createLedgerEntry({
      type: 'purchase',
      userId: user.id,
      amount: totalPrice,
      description: `Purchased ${roundedAmount}k gems at $${rate}/k`,
      relatedId: order.id,
    })

    // Create vendor earning if applicable (with TOCTOU double-check)
    if (isVendorPurchase && vendorId) {
      const verifyListing = await getVendorListing(vendorId)
      if (verifyListing && verifyListing.vendorId === vendorId) {
        await createVendorEarning(vendorId, order.id, totalPrice)
        await createLedgerEntry({
          type: 'vendor_earning',
          userId: vendorId,
          amount: totalPrice,
          description: `Vendor sale: ${roundedAmount}k gems to ${user.name}`,
          relatedId: order.id,
        })
      } else {
        console.error(`CRITICAL: Vendor ID mismatch at earning creation for order ${order.id}`)
      }
    }

    await notifyPurchase(user.name, `${roundedAmount}k Gems`, 1, totalPrice)

    return NextResponse.json({
      order,
      newBalance: await getWalletBalance(user.id),
    })
  } catch (error) {
    console.error('Gems purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to process gems purchase' },
      { status: 500 }
    )
  }
}
