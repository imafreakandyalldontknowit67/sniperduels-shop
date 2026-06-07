import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/storage'
import { localToUsd, usdToLocal, isSupportedCurrency } from '@/lib/fx'
import { calculateCardSubtotalCents, estimateCheckout } from '@/lib/pandabase'
import { logError } from '@/lib/error-log'

type BillingInput = {
  name?: unknown
  email?: unknown
  line1?: unknown
  line2?: unknown
  city?: unknown
  state?: unknown
  postal_code?: unknown
  country?: unknown
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function validateBilling(input: BillingInput) {
  const billing = {
    name: clean(input.name),
    email: clean(input.email),
    line1: clean(input.line1),
    line2: clean(input.line2),
    city: clean(input.city),
    state: clean(input.state).toUpperCase(),
    postal_code: clean(input.postal_code),
    country: clean(input.country).toUpperCase(),
  }

  if (!billing.name || billing.name.length > 128) return { error: 'Enter the billing name.' as const, billing }
  if (!validEmail(billing.email) || billing.email.length > 320) return { error: 'Enter a valid billing email.' as const, billing }
  if (!billing.line1 || billing.line1.length > 200) return { error: 'Enter the billing street address.' as const, billing }
  if (billing.line2.length > 200) return { error: 'Address line 2 is too long.' as const, billing }
  if (!billing.city || billing.city.length > 100) return { error: 'Enter the billing city.' as const, billing }
  if (!billing.state || billing.state.length > 100) return { error: 'Enter the billing state/province.' as const, billing }
  if (!billing.postal_code || billing.postal_code.length > 20) return { error: 'Enter the billing ZIP/postal code.' as const, billing }
  if (!/^[A-Z]{2}$/.test(billing.country)) return { error: 'Select a valid billing country.' as const, billing }

  return { billing }
}

function dollars(cents: number): number {
  return Math.round(cents) / 100
}

export async function POST(request: NextRequest) {
  try {
    // TEMP PREVIEW BYPASS: allow logged-out reviewers to calculate card totals
    // on the local rough-draft branch. Restore auth before shipping.

    const settings = await getSiteSettings()
    if (settings.depositsDisabled) {
      return NextResponse.json({ error: 'Deposits are currently disabled' }, { status: 403 })
    }

    let body: { amount?: unknown; localCurrency?: unknown; billing?: BillingInput }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { amount, localCurrency, billing: billingInput = {} } = body
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    const inputCurrency = (typeof localCurrency === 'string' && localCurrency.toUpperCase()) || 'USD'
    if (!isSupportedCurrency(inputCurrency)) {
      return NextResponse.json({ error: `Unsupported currency: ${inputCurrency}` }, { status: 400 })
    }

    const validated = validateBilling(billingInput)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const fx = await localToUsd(amount, inputCurrency)
    const walletCredit = fx.usdAmount
    if (walletCredit < 5) {
      const minLocal = await usdToLocal(5, inputCurrency)
      return NextResponse.json(
        { error: `Minimum is $5 USD${inputCurrency !== 'USD' ? ` (~${minLocal.toFixed(2)} ${inputCurrency})` : ''}` },
        { status: 400 }
      )
    }

    const walletCreditCents = Math.round(walletCredit * 100)
    const subtotalCents = calculateCardSubtotalCents(walletCreditCents)
    const estimate = await estimateCheckout(
      subtotalCents,
      validated.billing.country,
      validated.billing.state,
      walletCredit
    )

    const totalCents = Math.round(estimate.total)
    const taxCents = Math.round(estimate.tax?.amount ?? 0)

    return NextResponse.json({
      walletCredit,
      walletCreditCents,
      subtotal: dollars(subtotalCents),
      subtotalCents,
      processingRecovery: dollars(subtotalCents - walletCreditCents),
      processingRecoveryCents: subtotalCents - walletCreditCents,
      tax: dollars(taxCents),
      taxCents,
      taxRate: estimate.tax?.rate ?? 0,
      total: dollars(totalCents),
      totalCents,
      cryptoSavings: dollars(Math.max(0, totalCents - walletCreditCents)),
      cryptoSavingsCents: Math.max(0, totalCents - walletCreditCents),
      availablePaymentMethods: estimate.available_payment_methods || [],
      localAmount: amount,
      localCurrency: inputCurrency,
      fxRate: fx.rate,
      fxSource: fx.source,
      billingSummary: {
        country: validated.billing.country,
        state: validated.billing.state,
        postal_code: validated.billing.postal_code,
      },
    })
  } catch (error) {
    console.error('[deposits/estimate-card] exception:', error instanceof Error ? error.message : String(error))
    await logError({ where: 'deposits.estimate_card.exception', error })
    return NextResponse.json({ error: 'Failed to estimate card total' }, { status: 500 })
  }
}
