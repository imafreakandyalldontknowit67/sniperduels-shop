import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/pandabase'
import { getDepositByInvoiceId, getDepositByRefId, claimPendingDeposit, addToWallet, getUser, createLedgerEntry } from '@/lib/storage'
import type { Deposit } from '@/lib/storage'
import { notifyDispute, notifyRefund } from '@/lib/discord-webhook'
import { flagAndBlacklist } from '@/lib/blacklist'
import { logError } from '@/lib/error-log'
import { captureServerEvent, extractPandabasePaymentInfo } from '@/lib/posthog-api'

export const dynamic = 'force-dynamic'

async function findDeposit(payload: Record<string, unknown>): Promise<Deposit | undefined> {
  const data = (payload.data || {}) as Record<string, unknown>
  const order = (data.order || {}) as Record<string, unknown>
  const items = (order.items || []) as Array<Record<string, unknown>>

  // 1. Match by orderNumber (= our sessionId/cs_xxx stored as pandabaseInvoiceId)
  const orderNumber = (order.orderNumber || order.order_number || '') as string
  if (orderNumber) {
    const dep = await getDepositByInvoiceId(orderNumber)
    if (dep) { console.log(`[Webhook] Matched by orderNumber: ${orderNumber}`); return dep }
  }

  // 2. Match by refId from item name (#REFID suffix)
  for (const item of items) {
    const name = (item.name || '') as string
    const m = name.match(/#([A-Z0-9]+)$/)
    if (m) {
      const dep = await getDepositByRefId(m[1])
      if (dep) { console.log(`[Webhook] Matched by refId: ${m[1]}`); return dep }
    }
  }

  // 3. Try order.id
  const orderId = (order.id || '') as string
  if (orderId) {
    const dep = await getDepositByInvoiceId(orderId)
    if (dep) { console.log(`[Webhook] Matched by orderId: ${orderId}`); return dep }
  }

  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    if (!verifyWebhookSignature(rawBody, request.headers)) {
      console.error('[Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event || payload.type

    console.log(`[Webhook] Event: ${event}`)
    console.log(`[Webhook] Payload: ${JSON.stringify(payload).slice(0, 2000)}`)

    switch (event) {
      case 'payment.success':
      case 'PAYMENT_COMPLETED': {
        const deposit = await findDeposit(payload)
        if (!deposit) {
          console.warn('[Webhook] No deposit matched')
          return NextResponse.json({ received: true })
        }
        const claimed = await claimPendingDeposit(deposit.id)
        if (!claimed) {
          console.log(`[Webhook] Already claimed: ${deposit.id}`)
          return NextResponse.json({ received: true })
        }
        const credited = await addToWallet(deposit.userId, deposit.amount, {
          type: 'deposit',
          description: `Fiat deposit: $${deposit.amount}`,
          relatedId: deposit.id,
        })
        if (!credited) {
          console.error(`[pandabase] WALLET_CREDIT_FAILED user=${deposit.userId} amount=${deposit.amount} dep=${deposit.id}`)
          await logError({ where: 'deposit.credit_wallet_failed', userId: deposit.userId, error: 'addToWallet returned null', context: { depositId: deposit.id, amount: deposit.amount } })
          // Return 5xx so Pandabase retries — silent 200 here means orphaned payment.
          return NextResponse.json({ error: 'wallet credit failed' }, { status: 500 })
        }
        console.log(`[pandabase] wallet credit ok user=${deposit.userId} amount=${deposit.amount} dep=${deposit.id}`)
        console.log(`[Webhook] Deposit completed: ${deposit.id} ($${deposit.amount})`)

        // Server-side instrumentation: which method actually completed (card vs apple_pay vs google_pay etc),
        // brand/country/3DS, and processing time. The event is intentionally captured here (not the client)
        // so we don't lose it if the user closed their tab before the success callback.
        try {
          const info = extractPandabasePaymentInfo(payload)
          const processing_time_ms = deposit.createdAt ? (Date.now() - new Date(deposit.createdAt).getTime()) : undefined
          await captureServerEvent(deposit.userId, 'deposit_completed', {
            provider: 'pandabase',
            final_method: info.method || 'card',
            method: info.method || 'card',
            card_brand: info.card_brand,
            card_country: info.card_country,
            card_funding: info.card_funding,
            is_3ds: info.is_3ds,
            intent_id: info.intent_id,
            charge_id: info.charge_id,
            invoice_id: info.invoice_id || deposit.pandabaseInvoiceId,
            ref_id: info.ref_id || deposit.pandabaseRefId,
            deposit_id: deposit.id,
            amount: deposit.amount,
            amount_usd: deposit.amount,
            charge_amount: deposit.chargeAmount,
            currency: deposit.localCurrency || 'USD',
            local_amount: deposit.localAmount,
            fx_rate: deposit.fxRate,
            processing_time_ms,
          })
        } catch (err) {
          console.error('[posthog] deposit_completed capture failed:', err)
        }
        break
      }

      case 'payment.failed':
      case 'PAYMENT_FAILED': {
        const deposit = await findDeposit(payload)
        if (deposit && deposit.status === 'pending') {
          const { prisma } = await import('@/lib/prisma')
          await prisma.deposit.updateMany({
            where: { id: deposit.id, status: 'pending' },
            data: { status: 'failed', updatedAt: new Date().toISOString() },
          })
          console.log(`[Webhook] Failed: ${deposit.id}`)

          // Capture *why* it failed — decline_code, brand, country — so we can split
          // the 22% fail rate by root cause instead of the useless "payment_failed".
          try {
            const info = extractPandabasePaymentInfo(payload)
            await captureServerEvent(deposit.userId, 'deposit_failed', {
              provider: 'pandabase',
              payment_method_type: info.method || 'unknown',
              method: info.method || 'unknown',
              decline_code: info.decline_code || 'unknown',
              error_code: info.error_code,
              error_message: info.error_message,
              card_brand: info.card_brand,
              card_country: info.card_country,
              card_funding: info.card_funding,
              is_3ds: info.is_3ds,
              intent_id: info.intent_id,
              charge_id: info.charge_id,
              invoice_id: info.invoice_id || deposit.pandabaseInvoiceId,
              ref_id: info.ref_id || deposit.pandabaseRefId,
              deposit_id: deposit.id,
              amount: deposit.amount,
              amount_usd: deposit.amount,
              currency: deposit.localCurrency || 'USD',
              source: 'webhook',
            })
          } catch (err) {
            console.error('[posthog] deposit_failed capture failed:', err)
          }
        }
        break
      }

      case 'payment.refunded':
      case 'PAYMENT_REFUNDED': {
        const deposit = await findDeposit(payload)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyRefund(user?.name || deposit.userId, deposit.amount, deposit.pandabaseInvoiceId)
        }
        break
      }

      case 'payment.disputed':
      case 'PAYMENT_DISPUTED': {
        const deposit = await findDeposit(payload)
        if (deposit) {
          const user = await getUser(deposit.userId)
          await notifyDispute(user?.name || deposit.userId, deposit.amount, deposit.pandabaseInvoiceId)

          // Auto-blacklist the user who filed a dispute
          await flagAndBlacklist({
            ip: 'dispute-auto',
            userId: deposit.userId,
            reason: `Payment dispute filed on deposit ${deposit.id} ($${deposit.amount})`,
            endpoint: '/api/webhooks/pandabase',
          })
          console.log(`[Webhook] DISPUTE: Auto-blacklisted user ${deposit.userId} (${user?.name})`)
        }
        break
      }

      default:
        console.log(`[Webhook] Unhandled: ${event}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[pandabase] UNHANDLED_EXCEPTION', error instanceof Error ? error.message : String(error))
    await logError({ where: 'webhook.pandabase.exception', error })
    // Return 5xx so Pandabase retries instead of accepting a silent failure.
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
