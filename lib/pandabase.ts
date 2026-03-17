import crypto from 'crypto'

const PANDABASE_BASE_URL = 'https://api.pandabase.io'

const isDevMode = () => process.env.PANDABASE_DEV_MODE === 'true'

function getConfig() {
  if (isDevMode()) {
    return { secretKey: 'dev', shopId: 'dev' }
  }

  const secretKey = process.env.PANDABASE_SECRET_KEY
  const shopId = process.env.PANDABASE_SHOP_ID

  if (!secretKey || !shopId) {
    throw new Error('Missing PANDABASE_SECRET_KEY or PANDABASE_SHOP_ID environment variables')
  }

  return { secretKey, shopId }
}

export async function createDepositIntent(
  amount: number
): Promise<{ checkoutUrl: string; invoiceId: string; refId: string; sessionId: string }> {
  if (isDevMode()) {
    console.warn('[PANDABASE DEV MODE] Returning mock checkout — no real charge')
    const invoiceId = `dev_inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return {
      checkoutUrl: `/dev/checkout-success?amount=${amount}&invoiceId=${invoiceId}`,
      invoiceId,
      refId: 'DEV_REF',
      sessionId: 'dev_session',
    }
  }

  const { secretKey, shopId } = getConfig()
  const refId = crypto.randomBytes(4).toString('hex').toUpperCase()

  const response = await fetch(`${PANDABASE_BASE_URL}/v2/stores/${shopId}/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      items: [
        {
          name: `Wallet Deposit - $${amount.toFixed(2)} #${refId}`,
          amount: Math.round(amount * 100),
          quantity: 1,
        },
      ],
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/deposit`,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Pandabase createDepositIntent failed:', errorText)
    throw new Error(`Pandabase checkout initialization failed: ${response.status}`)
  }

  const data = await response.json()
  const checkoutUrl = data.data?.checkout_url || data.data?.pay_redirect_url
  const sessionId = data.data?.session_id || ''
  const checkoutId = sessionId || data.data?.id || checkoutUrl?.match(/sids\/([^/]+)/)?.[1] || checkoutUrl?.match(/cs_[a-zA-Z0-9]+/)?.[0]

  console.log('[Pandabase] Checkout response:', JSON.stringify(data).slice(0, 500))

  if (!checkoutUrl) {
    console.error('Pandabase response missing checkout URL:', JSON.stringify(data).slice(0, 500))
    throw new Error('Pandabase did not return a checkout URL')
  }

  return {
    checkoutUrl,
    invoiceId: checkoutId,
    refId,
    sessionId,
  }
}

export async function verifyInvoice(
  invoiceId: string
): Promise<{ isPaid: boolean; order: Record<string, unknown> | null; error: string | null }> {
  if (isDevMode()) {
    console.warn('[PANDABASE DEV MODE] Auto-approving invoice:', invoiceId)
    return {
      isPaid: true,
      order: { id: invoiceId, status: 'COMPLETED' },
      error: null,
    }
  }

  const { shopId } = getConfig()

  try {
    const response = await fetch(
      `${PANDABASE_BASE_URL}/shops/${shopId}/public/orders/invoices/${invoiceId}`,
      {
        headers: {
          'accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        return { isPaid: false, order: null, error: 'Invoice not found. Please check the invoice ID.' }
      }
      return { isPaid: false, order: null, error: `Invoice lookup failed: ${response.status}` }
    }

    const data = await response.json()
    const payload = data.payload

    // For dynamic payments, order status stays "PROCESSING" but
    // the transaction status goes to "PAID" when payment clears.
    // Check both: order-level COMPLETED or transaction-level PAID.
    const orderCompleted = payload.status === 'COMPLETED'
    const transactionPaid = Array.isArray(payload.transactions) &&
      payload.transactions.some((t: { status: string }) => t.status === 'PAID')

    return {
      isPaid: orderCompleted || transactionPaid,
      order: payload,
      error: null,
    }
  } catch (err) {
    console.error('Pandabase verifyInvoice error:', err)
    return { isPaid: false, order: null, error: 'Failed to verify invoice' }
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PANDABASE_WEBHOOK_SECRET
  if (!secret) {
    console.error('PANDABASE_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}
