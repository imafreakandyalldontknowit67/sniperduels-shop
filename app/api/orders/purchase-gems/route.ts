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
  addGemStock,
  getVendorListing,
  deductVendorStock,
  addVendorStock,
  getUser,
  getOrders,
} from '@/lib/storage'
import { notifyPurchase } from '@/lib/discord-webhook'
import { getBotLastHeartbeat, getBotGemBalance, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

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

    const dbUser = await getUser(user.id)
    if (dbUser?.isVendor) {
      return NextResponse.json({ error: 'Vendor accounts cannot make purchases. Your balance is withdraw-only — request a payout via Discord.' }, { status: 403 })
    }

    const lastHeartbeat = await getBotLastHeartbeat()
    if (Date.now() - lastHeartbeat > BOT_OFFLINE_THRESHOLD_MS) {
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

    if (!amountInK || typeof amountInK !== 'number' || !Number.isInteger(amountInK) || amountInK < 1 || amountInK > 500) {
      return NextResponse.json(
        { error: 'amountInK must be an integer between 1 and 500' },
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

    // Calculate price — discounts only apply to platform stock, not vendor listings
    const loyalty = await getUserLoyaltyInfo(user.id)
    const discordEligible = await canUseDiscordFirstPurchaseDiscount(user.id)
    const combinedDiscount = isVendorPurchase ? 0 : loyalty.discount + (discordEligible ? 0.025 : 0)
    const basePrice = Math.round(roundedAmount * rate * 100) / 100
    const totalPrice = Math.round(basePrice * (1 - combinedDiscount) * 100) / 100

    // Check wallet balance (round to cents to avoid floating point comparison issues)
    const balance = Math.round(await getWalletBalance(user.id) * 100) / 100
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

    // Guard: check bot's actual gem balance can cover all pending orders + this one
    const botBalance = getBotGemBalance()
    if (botBalance != null) {
      const allOrders = await getOrders()
      const pendingTotal = allOrders
        .filter(o => o.status === 'pending' || o.status === 'processing')
        .reduce((sum, o) => sum + o.quantity, 0)
      if (pendingTotal + roundedAmount > botBalance) {
        // Reverse: restore stock
        if (isVendorPurchase && vendorId) {
          await addVendorStock(vendorId, roundedAmount)
        } else {
          await addGemStock(roundedAmount)
        }
        await addToWallet(user.id, totalPrice)
        await addToLifetimeSpend(user.id, -totalPrice)
        return NextResponse.json(
          { error: 'The bot is running low on gems. Please try a smaller amount or wait for restocking.' },
          { status: 503 }
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
    if (discordEligible && !isVendorPurchase) {
      await markDiscordFirstPurchaseUsed(user.id)
    }

    // Vendor earnings + ledger entries are created when the order completes
    // (in bot complete route), NOT here — because the order might fail/cancel
    // before delivery, and we don't want vendors paid for undelivered orders.

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
