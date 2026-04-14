import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getOrder, updateOrder, updateOrderStatus, addVendorStock, claimVendorDeposit, addGemStock, deductGemStock, deductVendorStock, deductFromWallet, addToLifetimeSpend, createLedgerEntry, createVendorEarning } from '@/lib/storage'
import { processReferralCommission } from '@/lib/referral'

function authenticateBot(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-bot-api-key')
  if (!apiKey || !process.env.BOT_API_KEY) return false
  try {
    return timingSafeEqual(
      Buffer.from(apiKey),
      Buffer.from(process.env.BOT_API_KEY)
    )
  } catch {
    return false
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authenticateBot(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const order = await getOrder(id)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Atomic transition: only complete if still pending/processing
  const updated = await updateOrderStatus(id, ['pending', 'processing'], {
    status: 'completed',
    completedAt: new Date().toISOString(),
  })

  if (!updated) {
    // If order was auto-expired or bot-restarted, reverse the refund and complete it
    // This handles the race where the bot sends gems but the order was already failed
    if (order.status === 'failed' && order.notes && (order.notes.includes('Auto-expired') || order.notes.includes('Bot restarted'))) {
      console.error(`CRITICAL: Bot completed order ${id} that was already failed (${order.notes}). Reversing refund.`)

      // Re-deduct wallet (undo refund)
      const isRegular = order.type === 'gems' && !order.notes.includes('platform-deposit') && !order.notes.includes('vendor-deposit') && !order.notes.includes('vendor-withdrawal') && !order.notes.includes('platform-withdraw')
      if (isRegular) {
        await deductFromWallet(order.userId, Number(order.totalPrice))
        await addToLifetimeSpend(order.userId, -Number(order.totalPrice))

        // Re-deduct stock (undo restoration)
        if (order.vendorListingId && order.vendorListingId !== 'platform') {
          await deductVendorStock(order.vendorListingId, order.quantity)
        } else {
          await deductGemStock(order.quantity)
        }
      }

      // Force-update to completed
      await updateOrder(id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        notes: `${order.notes} | REVERSED: Bot confirmed delivery after failure`,
      })

      // Create vendor earning + ledger entries (same as normal completion path)
      if (isRegular) {
        createLedgerEntry({
          type: 'purchase',
          userId: order.userId,
          amount: order.totalPrice,
          description: `Purchased ${order.quantity}k gems at $${order.pricePerUnit}/k (reversed from failed)`,
          relatedId: order.id,
        }).catch(err => console.error('Ledger write failed (reversed purchase):', err))

        if (order.vendorListingId && order.vendorListingId !== 'platform') {
          try {
            await createVendorEarning(order.vendorListingId, order.id, Number(order.totalPrice))
          } catch (err) {
            console.error(`CRITICAL: Vendor earning creation failed for reversed order ${order.id}:`, err)
          }
        }
      }

      return NextResponse.json({
        order: await getOrder(id),
        warning: 'Order was failed but bot confirmed delivery — refund reversed',
      })
    }

    return NextResponse.json(
      { error: `Order was already ${order.status} — cannot complete` },
      { status: 409 }
    )
  }

  // If this is a platform deposit order, add to platform gem stock
  if (order.notes === 'platform-deposit') {
    await addGemStock(order.quantity)
    createLedgerEntry({
      type: 'deposit',
      userId: order.userId,
      amount: 0,
      description: `Platform gem deposit: ${order.quantity}k gems added to official stock`,
      relatedId: order.id,
    }).catch(err => console.error('Ledger write failed (platform deposit):', err))
  }

  // If this is a vendor deposit order, atomically claim and credit stock
  if (order.notes?.startsWith('vendor-deposit:')) {
    const depositId = order.notes.replace('vendor-deposit:', '')
    const claimed = await claimVendorDeposit(depositId)
    if (claimed) {
      await addVendorStock(order.userId, order.quantity)
    }
    // If not claimed, another process already credited stock — skip
  }

  // Vendor withdrawal orders: stock was already deducted at submission time, so just mark complete
  // No additional stock changes needed here
  if (order.notes?.startsWith('vendor-withdrawal:')) {
    // Nothing extra to do — completion is handled by the updateOrder above
  }

  // Log completed purchase to ledger + create vendor earning (only on successful delivery)
  const isRegularPurchase = order.type === 'gems' && order.notes !== 'platform-deposit' && !order.notes?.startsWith('vendor-deposit:') && !order.notes?.startsWith('vendor-withdrawal:') && order.notes !== 'platform-withdraw'
  if (isRegularPurchase) {
    createLedgerEntry({
      type: 'purchase',
      userId: order.userId,
      amount: order.totalPrice,
      description: `Purchased ${order.quantity}k gems at $${order.pricePerUnit}/k`,
      relatedId: order.id,
    }).catch(err => console.error('Ledger write failed (purchase complete):', err))

    // Create vendor earning NOW (on delivery), not at purchase time
    // This ensures vendors only get paid for orders that actually complete
    if (order.vendorListingId && order.vendorListingId !== 'platform') {
      try {
        await createVendorEarning(order.vendorListingId, order.id, order.totalPrice)
      } catch (err) {
        console.error(`CRITICAL: Vendor earning creation failed for order ${order.id}:`, err)
      }

      createLedgerEntry({
        type: 'vendor_earning',
        userId: order.vendorListingId,
        amount: order.totalPrice,
        description: `Vendor sale: ${order.quantity}k gems`,
        relatedId: order.id,
      }).catch(err => console.error('Ledger write failed (vendor_earning complete):', err))
    }
  }

  // Process referral commission on first completed order
  if (isRegularPurchase) {
    processReferralCommission(id, order.userId).catch(err =>
      console.error(`[Referral] Commission processing failed for order ${id}:`, err)
    )
  }

  return NextResponse.json({ order: updated })
}
