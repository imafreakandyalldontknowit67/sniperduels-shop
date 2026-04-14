import crypto from 'crypto'

const API_URL = 'https://api.nowpayments.io/v1'

function getApiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY
  if (!key) throw new Error('NOWPAYMENTS_API_KEY not configured')
  return key
}

export const SUPPORTED_CURRENCIES = [
  { id: 'btc', name: 'Bitcoin', network: 'Bitcoin' },
  { id: 'eth', name: 'Ethereum', network: 'ERC-20' },
  { id: 'sol', name: 'Solana', network: 'Solana' },
  { id: 'usdtsol', name: 'USDT', network: 'Solana' },
  { id: 'usdcsol', name: 'USDC', network: 'Solana' },
  { id: 'ltc', name: 'Litecoin', network: 'Litecoin' },
] as const

export async function createCryptoPayment(
  amount: number,
  depositId: string,
  currency: string
): Promise<{
  paymentId: string
  payAddress: string
  payAmount: number
  payCurrency: string
}> {
  const res = await fetch(`${API_URL}/payment`, {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: amount,
      price_currency: 'usd',
      pay_currency: currency,
      order_id: depositId,
      ipn_callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/nowpayments`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[NOWPayments] Create payment failed:', res.status, text)
    throw new Error(`NOWPayments payment creation failed: ${res.status} - ${text}`)
  }

  const data = await res.json()
  console.log('[NOWPayments] Payment created:', JSON.stringify(data).slice(0, 500))

  return {
    paymentId: String(data.payment_id),
    payAddress: data.pay_address,
    payAmount: data.pay_amount,
    payCurrency: data.pay_currency,
  }
}

export async function getPaymentStatus(paymentId: string): Promise<string> {
  const res = await fetch(`${API_URL}/payment/${paymentId}`, {
    headers: { 'x-api-key': getApiKey() },
  })
  if (!res.ok) return 'unknown'
  const data = await res.json()
  return data.payment_status || 'unknown'
}

export async function getMinimumAmount(currency: string): Promise<number> {
  const res = await fetch(`${API_URL}/min-amount?currency_from=usd&currency_to=${currency}&fiat_equivalent=usd`, {
    headers: { 'x-api-key': getApiKey() },
  })
  if (!res.ok) return 20 // Safe default
  const data = await res.json()
  return data.fiat_equivalent || 20
}

export function verifyIpnSignature(payload: Record<string, unknown>, signature: string): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret) {
    console.error('[NOWPayments] IPN secret not configured')
    return false
  }
  try {
    // NOWPayments IPN verification: sort keys alphabetically, HMAC-SHA512
    const sorted = Object.keys(payload).sort().reduce((acc: Record<string, unknown>, key) => {
      acc[key] = payload[key]
      return acc
    }, {})
    const expected = crypto.createHmac('sha512', secret).update(JSON.stringify(sorted)).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  } catch (err) {
    console.error('[NOWPayments] Signature verification error:', err)
    return false
  }
}
