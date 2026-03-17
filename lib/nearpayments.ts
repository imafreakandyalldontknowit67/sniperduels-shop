import crypto from 'crypto'

const API_URL = 'https://api.nearpayments.io/v1'

function getApiKey(): string {
  const key = process.env.NEARPAYMENTS_API_KEY
  if (!key) throw new Error('NEARPAYMENTS_API_KEY not configured')
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
  paymentId: number
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
      ipn_callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/nearpayments`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[NearPayments] Create payment failed:', res.status, text)
    throw new Error(`NearPayments payment creation failed: ${res.status}`)
  }

  const data = await res.json()
  console.log('[NearPayments] Payment created:', JSON.stringify(data).slice(0, 500))

  return {
    paymentId: data.payment_id,
    payAddress: data.pay_address,
    payAmount: data.pay_amount,
    payCurrency: data.pay_currency,
  }
}

export async function getPaymentStatus(paymentId: number): Promise<string> {
  const res = await fetch(`${API_URL}/payment/${paymentId}`, {
    headers: { 'x-api-key': getApiKey() },
  })
  if (!res.ok) return 'unknown'
  const data = await res.json()
  return data.payment_status || 'unknown'
}

export function verifyIpnSignature(payload: Record<string, unknown>, signature: string): boolean {
  const secret = process.env.NEARPAYMENTS_IPN_SECRET
  if (!secret) {
    console.error('[NearPayments] IPN secret not configured')
    return false
  }
  try {
    const sorted = Object.keys(payload).sort().reduce((acc: Record<string, unknown>, key) => {
      acc[key] = payload[key]
      return acc
    }, {})
    const expected = crypto.createHmac('sha512', secret).update(JSON.stringify(sorted)).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
