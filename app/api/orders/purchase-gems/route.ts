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
} from '@/lib/storage'
import { notifyPurchase } from '@/lib/discord-webhook'

const PRICING_TIERS = [
  { min: 1, max: 9, rate: 2.90 },
  { min: 10, max: 74, rate: 2.80 },
  { min: 75, max: 500, rate: 2.65 },
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

    const body = await request.json()
    const { amountInK } = body

    if (!amountInK || typeof amountInK !== 'number' || !Number.isInteger(amountInK) || amountInK < 1 || amountInK > 500) {
      return NextResponse.json(
        { error: 'amountInK must be an integer between 1 and 500' },
        { status: 400 }
      )
    }

    const roundedAmount = amountInK

    // Check gem stock
    const gemStock = await getGemStock()
    if (gemStock < roundedAmount) {
      return NextResponse.json(
        {
          error: 'Not enough gems in stock',
          available: gemStock,
          requested: roundedAmount,
        },
        { status: 400 }
      )
    }

    // Calculate price with loyalty + discord discounts
    const rate = getRate(roundedAmount)
    const loyalty = await getUserLoyaltyInfo(user.id)
    const discordEligible = await canUseDiscordFirstPurchaseDiscount(user.id)
    const combinedDiscount = loyalty.discount + (discordEligible ? 0.025 : 0)
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

    // Deduct gem stock (re-check freshly to avoid stale data)
    const deducted = await deductGemStock(roundedAmount)
    if (!deducted) {
      // Refund wallet since gems went out of stock between check and deduction
      await addToWallet(user.id, totalPrice)
      return NextResponse.json(
        { error: 'Gems went out of stock. Wallet refunded.' },
        { status: 409 }
      )
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
    })

    // Track lifetime spend + consume discord first-purchase bonus
    await addToLifetimeSpend(user.id, totalPrice)
    if (discordEligible) {
      await markDiscordFirstPurchaseUsed(user.id)
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
