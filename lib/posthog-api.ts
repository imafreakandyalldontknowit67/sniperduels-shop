const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY || ''
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '1'
const POSTHOG_PROJECT_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''

export async function captureServerEvent(distinctId: string, event: string, properties?: Record<string, unknown>) {
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_PROJECT_KEY,
        distinct_id: distinctId,
        event,
        properties: { ...properties, $lib: 'server' },
      }),
    })
  } catch {
    // Non-critical — don't break the flow
  }
}

// ─── Payment event helpers ────────────────────────────────────────────────
// Extract instrumentation-safe fields from provider webhook payloads. These
// helpers never return PANs, CVCs, full card numbers, IPs, or private keys —
// only brand/country/decline-code/status data that's safe to send to PostHog.

type AnyRecord = Record<string, unknown>

function pick(obj: AnyRecord | undefined | null, ...keys: string[]): unknown {
  if (!obj) return undefined
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  const s = String(v).trim()
  return s ? s : undefined
}

function asBool(v: unknown): boolean | undefined {
  if (v === true || v === 'true' || v === 'yes' || v === 'authenticated' || v === 'required' || v === 'optional') return true
  if (v === false || v === 'false' || v === 'no' || v === 'not_supported' || v === 'failed') return false
  return undefined
}

/**
 * Extract Stripe-flavoured payment-method details from a Pandabase webhook
 * payload. Pandabase wraps Stripe's PaymentIntent under various paths
 * (data.charge, data.payment_method, data.order.payment); we probe each.
 *
 * Returns method (card/apple_pay/google_pay/cashapp/etc), card_brand,
 * card_country, is_3ds, decline_code (for failures), and error_message.
 */
export function extractPandabasePaymentInfo(payload: AnyRecord): {
  method?: string
  card_brand?: string
  card_country?: string
  card_funding?: string
  is_3ds?: boolean
  decline_code?: string
  error_code?: string
  error_message?: string
  intent_id?: string
  charge_id?: string
  invoice_id?: string
  ref_id?: string
} {
  const data = (payload.data || payload) as AnyRecord
  const order = (data.order || {}) as AnyRecord
  const charge = (data.charge || data.payment || {}) as AnyRecord
  const pm = (data.payment_method || charge.payment_method || {}) as AnyRecord
  const pmDetails = (charge.payment_method_details || data.payment_method_details || pm.details || {}) as AnyRecord
  const card = (pmDetails.card || pm.card || {}) as AnyRecord
  const wallet = (card.wallet || pmDetails.wallet || {}) as AnyRecord
  const lastErr = (charge.last_payment_error || data.last_payment_error || data.error || {}) as AnyRecord

  // Determine method: wallet (apple_pay/google_pay/cashapp/etc) → card_funding → top-level type
  let method: string | undefined
  const walletType = asString(pick(wallet, 'type'))
  const pmType = asString(pick(pmDetails, 'type')) || asString(pick(pm, 'type'))
  if (walletType) method = walletType.toLowerCase() // apple_pay | google_pay | cashapp
  else if (pmType) method = pmType.toLowerCase() // card | cashapp | sepa_debit | ideal | etc

  // 3DS authentication state
  const tds = pick(card, 'three_d_secure', 'three_d_secure_authenticated') as AnyRecord | string | undefined
  let is_3ds: boolean | undefined
  if (tds && typeof tds === 'object') {
    is_3ds = asBool(pick(tds, 'authentication_flow', 'result', 'authenticated'))
  } else {
    is_3ds = asBool(tds)
  }

  return {
    method,
    card_brand: asString(pick(card, 'brand', 'network')),
    card_country: asString(pick(card, 'country', 'issuer_country')),
    card_funding: asString(pick(card, 'funding')),
    is_3ds,
    decline_code: asString(pick(lastErr, 'decline_code', 'declineCode')),
    error_code: asString(pick(lastErr, 'code', 'error_code')),
    // Strip PII / sensitive substrings just in case (we don't want raw card numbers)
    error_message: asString(pick(lastErr, 'message', 'description'))?.slice(0, 300),
    intent_id: asString(pick(charge, 'payment_intent', 'id') || pick(data, 'payment_intent_id', 'intent_id', 'id')),
    charge_id: asString(pick(charge, 'id')),
    invoice_id: asString(pick(order, 'orderNumber', 'order_number', 'id')),
    ref_id: (() => {
      const items = (order.items || []) as Array<AnyRecord>
      for (const it of items) {
        const m = asString(it.name)?.match(/#([A-Z0-9]+)$/)
        if (m) return m[1]
      }
      return undefined
    })(),
  }
}

/**
 * Map a NowPayments `pay_currency` (e.g. "btc", "usdtsol", "ethbsc") to a
 * normalized PostHog-friendly final_method string for funnel analysis.
 */
export function cryptoFinalMethod(payCurrency: string | undefined): string {
  if (!payCurrency) return 'crypto_unknown'
  const c = payCurrency.toLowerCase()
  if (c.startsWith('btc')) return 'crypto_btc'
  if (c.startsWith('eth') && !c.startsWith('etherc') && c !== 'ethbsc') return 'crypto_eth'
  if (c.startsWith('usdt')) return 'crypto_usdt'
  if (c.startsWith('usdc')) return 'crypto_usdc'
  if (c.startsWith('sol') || c === 'sol') return 'crypto_sol'
  if (c.startsWith('ltc')) return 'crypto_ltc'
  if (c.startsWith('doge')) return 'crypto_doge'
  if (c.startsWith('xrp')) return 'crypto_xrp'
  if (c.startsWith('trx')) return 'crypto_trx'
  if (c.startsWith('bnb')) return 'crypto_bnb'
  return `crypto_${c}`
}

/**
 * Pull instrumentation-safe fields from a NowPayments / NearPayments IPN.
 */
export function extractCryptoPaymentInfo(payload: AnyRecord): {
  pay_currency?: string
  final_method: string
  payment_status?: string
  pay_amount?: number
  actually_paid?: number
  outcome_amount?: number
  outcome_currency?: string
  price_amount?: number
  price_currency?: string
  payment_id?: string
  order_id?: string
  tx_hash?: string
  ratio?: number
} {
  const payCurrency = asString(payload.pay_currency)
  const payAmount = Number(payload.pay_amount || 0) || undefined
  const actuallyPaid = Number(payload.actually_paid || 0) || undefined
  const ratio = payAmount && actuallyPaid ? actuallyPaid / payAmount : undefined
  return {
    pay_currency: payCurrency,
    final_method: cryptoFinalMethod(payCurrency),
    payment_status: asString(payload.payment_status),
    pay_amount: payAmount,
    actually_paid: actuallyPaid,
    outcome_amount: Number(payload.outcome_amount || 0) || undefined,
    outcome_currency: asString(payload.outcome_currency),
    price_amount: Number(payload.price_amount || 0) || undefined,
    price_currency: asString(payload.price_currency),
    payment_id: asString(payload.payment_id),
    order_id: asString(payload.order_id),
    // NowPayments occasionally surfaces tx ids under different keys; harvest any
    tx_hash: asString(payload.payin_hash || payload.tx_id || payload.txid || payload.transaction_hash),
    ratio,
  }
}

interface PostHogQueryOptions {
  dateFrom?: string
  dateTo?: string
}

async function posthogFetch(path: string, options?: RequestInit) {
  const url = `${POSTHOG_HOST}${path}`
  const res = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`PostHog API error: ${res.status} ${res.statusText} – ${body.slice(0, 200)}`)
  }
  return res.json()
}

export async function queryTrend(events: string[], opts: PostHogQueryOptions = {}) {
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/`, {
    method: 'POST',
    body: JSON.stringify({
      events: events.map(e => ({ id: e, type: 'events' })),
      date_from: opts.dateFrom || '-7d',
      date_to: opts.dateTo,
      interval: 'day',
    }),
  })
}

export async function queryFunnel(steps: string[], opts: PostHogQueryOptions = {}) {
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/insights/funnel/`, {
    method: 'POST',
    body: JSON.stringify({
      events: steps.map(s => ({ id: s, type: 'events', order: 0 })),
      funnel_window_days: 14,
      date_from: opts.dateFrom || '-7d',
      date_to: opts.dateTo,
    }),
  })
}

export async function queryEvents(event: string, limit = 100, opts: PostHogQueryOptions = {}) {
  const params = new URLSearchParams({
    event,
    limit: limit.toString(),
    ...(opts.dateFrom && { after: opts.dateFrom }),
    ...(opts.dateTo && { before: opts.dateTo }),
  })
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/events/?${params}`)
}

export async function queryInsight(shortId: string) {
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/insights/?short_id=${shortId}`)
}

export async function queryPersons(search?: string, limit = 100) {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (search) params.set('search', search)
  return posthogFetch(`/api/projects/${POSTHOG_PROJECT_ID}/persons/?${params}`)
}

export async function querySessionCount(opts: PostHogQueryOptions = {}) {
  return queryTrend(['$pageview'], opts)
}
