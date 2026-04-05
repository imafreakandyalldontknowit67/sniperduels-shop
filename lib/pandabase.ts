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
 * Returns the session ID (cs_xxx) and checkout URL.
 */
export async function createCheckout(amount: number): Promise<{
  sessionId: string
  checkoutUrl: string
  refId: string
}> {
  const refId = crypto.randomBytes(4).toString('hex').toUpperCase()

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
        name: `Wallet Deposit - $${amount.toFixed(2)} #${refId}`,
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

/**
 * Verify a Pandabase webhook signature (HMAC-SHA256).
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PANDABASE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Pandabase] PANDABASE_WEBHOOK_SECRET not configured')
    return false
  }
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
