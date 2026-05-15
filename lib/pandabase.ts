import crypto from 'crypto'

const API_URL = 'https://api.pandabase.io'

function getConfig() {
  if (process.env.PANDABASE_DEV_MODE === 'true') {
    return { secretKey: 'dev', shopId: 'dev' }
  }
  const secretKey = process.env.PANDABASE_SECRET_KEY
  const shopId = process.env.PANDABASE_SHOP_ID
  if (!secretKey || !shopId) {
    throw new Error('Missing PANDABASE_SECRET_KEY or PANDABASE_SHOP_ID')
  }
  return { secretKey, shopId }
}

/**
 * Create a Pandabase v2 checkout session.
 * `amount` is what we charge subtotal-wise (wallet credit + our processing fee).
 * `walletCredit` is what the customer actually gets in their wallet — embedded in
 * the line-item name so the Pandabase pay page reads "wallet credit ($X.XX)"
 * instead of the misleading "Wallet Deposit - $chargeAmount" we used to show.
 *
 * The trailing `#${refId}` MUST stay at the end of the name — the webhook
 * matcher (app/api/webhooks/pandabase/route.ts) extracts it via regex.
 */
export async function createCheckout(amount: number, walletCredit?: number): Promise<{
  sessionId: string
  checkoutUrl: string
  refId: string
}> {
  const refId = crypto.randomBytes(4).toString('hex').toUpperCase()
  const credit = walletCredit ?? amount

  if (process.env.PANDABASE_DEV_MODE === 'true') {
    return {
      sessionId: `dev_${Date.now()}`,
      checkoutUrl: `/dev/checkout-success?amount=${amount}&invoiceId=dev_${Date.now()}`,
      refId,
    }
  }

  const { secretKey, shopId } = getConfig()

  const res = await fetch(`${API_URL}/v2/stores/${shopId}/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      currency: 'usd',
      items: [{
        name: `sniperduels.shop wallet credit ($${credit.toFixed(2)}) #${refId}`,
        amount: Math.round(amount * 100),
        quantity: 1,
      }],
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/deposit`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[Pandabase] Checkout failed:', res.status, text)
    throw new Error(`Pandabase checkout failed: ${res.status}`)
  }

  const json = await res.json()
  console.log('[Pandabase] Checkout response:', JSON.stringify(json).slice(0, 500))

  const d = json.data
  const sessionId = d.id // cs_xxx
  const checkoutUrl = d.checkout_url || d.pay_redirect_url

  if (!sessionId || !checkoutUrl) {
    throw new Error('Pandabase response missing sessionId or checkoutUrl')
  }

  return { sessionId, checkoutUrl, refId }
}

// Replay window for V2 (Standard Webhooks): reject events older than 5 minutes.
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60

type HeaderLookup = Headers | { get(name: string): string | null }

/**
 * Verify a Pandabase webhook signature.
 *
 * Dual-path during the V1→V2 migration (https://docs.pandabase.io/developers/webhooks/migrate-signatures):
 *   - V2 (Standard Webhooks): Webhook-Signature is "v1,<base64> v1,<base64> ...",
 *     signs `${webhook-id}.${webhook-timestamp}.${rawBody}`, timestamp in seconds.
 *   - Legacy X-Pandabase: signs rawBody only, hex digest in x-pandabase-signature.
 *
 * Tries V2 first; falls back to legacy. Once Pandabase is flipped to V2 and
 * stable for ~1 week, the legacy path can be deleted.
 */
export function verifyWebhookSignature(rawBody: string, headers: HeaderLookup): boolean {
  const secret = process.env.PANDABASE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Pandabase] PANDABASE_WEBHOOK_SECRET not configured')
    return false
  }
  return verifyV2(rawBody, headers, secret) || verifyLegacy(rawBody, headers, secret)
}

function verifyV2(rawBody: string, headers: HeaderLookup, secret: string): boolean {
  const id = headers.get('webhook-id')
  const ts = headers.get('webhook-timestamp')
  const sigHeader = headers.get('webhook-signature')
  if (!id || !ts || !sigHeader) return false

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return false
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - tsNum) > WEBHOOK_TOLERANCE_SECONDS) return false

  const signed = `${id}.${ts}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('base64')
  const expectedBuf = Buffer.from(expected)

  // Webhook-Signature is a space-separated list of "v1,<base64>" entries.
  for (const entry of sigHeader.split(' ')) {
    const comma = entry.indexOf(',')
    if (comma === -1) continue
    if (entry.slice(0, comma) !== 'v1') continue
    const sig = entry.slice(comma + 1)
    if (sig.length !== expectedBuf.length) continue
    try {
      if (crypto.timingSafeEqual(Buffer.from(sig), expectedBuf)) return true
    } catch {
      // length mismatch on Buffer.from edge cases — skip
    }
  }
  return false
}

function verifyLegacy(rawBody: string, headers: HeaderLookup, secret: string): boolean {
  const signature = headers.get('x-pandabase-signature')
  if (!signature) return false
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const a = Buffer.from(signature, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
