import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getStockItem,
  updateStockItem,
  deductFromWallet,
  addToWallet,
  createOrder,
  getUserLoyaltyInfo,
  addToLifetimeSpend,
  getWalletBalance,
  canUseDiscordFirstPurchaseDiscount,
  markDiscordFirstPurchaseUsed,
  getSiteSettings,
} from '@/lib/storage'
import { notifyPurchase } from '@/lib/discord-webhook'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Block item purchases when items are marked as coming soon
    const settings = await getSiteSettings()
    if (settings.itemsComingSoon) {
      return NextResponse.json({ error: 'Item purchases are not yet available' }, { status: 403 })
    }

    const body = await request.json()
    const { itemId, quantity = 1 } = body

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return NextResponse.json({ error: 'Quantity must be an integer between 1 and 10' }, { status: 400 })
    }

    // Validate item exists and is active
    const item = await getStockItem(itemId)
    if (!item || !item.active) {
      return NextResponse.json({ error: 'Item not found or not available' }, { status: 404 })
    }

    // Check stock
    if (item.stock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Only ${item.stock} available.` },
        { status: 400 }
      )
    }

    // Calculate price with loyalty + discord discounts
    const loyalty = await getUserLoyaltyInfo(user.id)
    const discordEligible = await canUseDiscordFirstPurchaseDiscount(user.id)
    const combinedDiscount = loyalty.discount + (discordEligible ? 0.01 : 0)
    const pricePerUnit = item.priceUsd * (1 - combinedDiscount)
    const totalPrice = Math.round(pricePerUnit * quantity * 100) / 100

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

    // Atomically decrement stock (re-read current stock to avoid stale value)
    const freshItem = await getStockItem(item.id)
    if (!freshItem || freshItem.stock < quantity) {
      // Refund the wallet since stock changed between check and deduction
      await addToWallet(user.id, totalPrice)
      return NextResponse.json(
        { error: 'Item went out of stock. Wallet refunded.' },
        { status: 409 }
      )
    }
    await updateStockItem(item.id, { stock: freshItem.stock - quantity })

    // Create order
    const order = await createOrder({
      userId: user.id,
      userName: user.name,
      type: item.type === 'crate' ? 'crate' : 'item',
      itemName: item.name,
      quantity,
      pricePerUnit: Math.round(pricePerUnit * 100) / 100,
      totalPrice,
      status: 'pending',
    })

    // Track lifetime spend + consume discord first-purchase bonus
    await addToLifetimeSpend(user.id, totalPrice)
    if (discordEligible) {
      await markDiscordFirstPurchaseUsed(user.id)
    }

    await notifyPurchase(user.name, item.name, quantity, totalPrice)

    return NextResponse.json({
      order,
      newBalance: await getWalletBalance(user.id),
    })
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
