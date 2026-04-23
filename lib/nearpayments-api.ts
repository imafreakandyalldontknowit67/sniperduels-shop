const API_URL = 'https://api.nearpayments.io/v1'

function getApiKey(): string {
  const key = process.env.NEARPAYMENTS_API_KEY
  if (!key) throw new Error('NEARPAYMENTS_API_KEY not configured')
  return key
}

export interface CryptoPayment {
  payment_id: number
  payment_status: string
  price_amount: number
  price_currency: string
  pay_amount: number
  actually_paid: number
  pay_currency: string
  order_id: string
  created_at: string
  updated_at: string
}

export async function getCryptoPayments(): Promise<CryptoPayment[]> {
  const all: CryptoPayment[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const res = await fetch(`${API_URL}/payment/?limit=100&page=${page}`, {
      headers: { 'x-api-key': getApiKey() },
    })
    if (!res.ok) break
    const data = await res.json()
    const items = data.data || []
    all.push(...items)
    hasMore = page < (data.pagesCount || 1) - 1
    page++
  }

  return all
}

export function summarizeCryptoPayments(payments: CryptoPayment[]) {
  const completed = payments.filter(p => p.payment_status === 'finished' || p.payment_status === 'confirmed')
  const totalUsd = completed.reduce((sum, p) => sum + p.price_amount, 0)
  return {
    totalDeposited: Math.round(totalUsd * 100) / 100,
    completedCount: completed.length,
    totalCount: payments.length,
    payments,
  }
}
