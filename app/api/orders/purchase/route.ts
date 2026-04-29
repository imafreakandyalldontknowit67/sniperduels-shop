import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { logError } from '@/lib/error-log'
import {
  getStockItem,
  deductItemStock,
  deductFromWallet,
  addToWallet,
  createOrder,
  getUserLoyaltyInfo,
  addToLifetimeSpend,
  getWalletBalance,
  canUseDiscordFirstPurchaseDiscount,
  markDiscordFirstPurchaseUsed,
  getSiteSettings,
  getUser,
} from '@/lib/storage'
import { notifyPurchase } from '@/lib/discord-webhook'
import { getBotLastHeartbeat, BOT_OFFLINE_THRESHOLD_MS } from '@/lib/bot-heartbeat'

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null
  try {
    user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await getUser(user.id)
    if (dbUser?.isVendor) {
      return NextResponse.json({ error: 'Vendor accounts cannot make purchases. Your balance is withdraw-only — request a payout via Discord.' }, { status: 403 })
    }

    // Block item purchases when items are marked as coming soon
    const settings = await getSiteSettings()
    if (settings.itemsComingSoon) {
      return NextResponse.json({ error: 'Item purchases are not yet available' }, { status: 403 })
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

    // Atomically decrement stock with row-level lock
    const deducted = await deductItemStock(item.id, quantity)
    if (!deducted) {
      const refunded = await addToWallet(user.id, totalPrice)
      if (!refunded) {
        console.error(`CRITICAL: Refund failed for user ${user.id}, amount $${totalPrice}. Wallet at max.`)
        await logError({ where: 'purchase_item.refund_failed', userId: user.id, error: 'wallet at max during refund', context: { amount: totalPrice, itemId } })
        return NextResponse.json(
          { error: 'Item went out of stock. Refund could not be processed - contact support.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Item went out of stock. Wallet refunded.' },
        { status: 409 }
      )
    }

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
    await logError({ where: 'purchase_item.exception', userId: user?.id, error })
    return NextResponse.json(
      { error: 'Failed to process purchase' },
      { status: 500 }
    )
  }
}
