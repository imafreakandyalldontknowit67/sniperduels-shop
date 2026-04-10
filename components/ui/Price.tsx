'use client'

import { useCurrency } from '@/components/providers'

export function Price({ amount }: { amount: number }) {
  const { formatPrice } = useCurrency()
  return <>{formatPrice(amount)}</>
}

export function PricePerK({ amount }: { amount: number }) {
  const { formatPricePerK } = useCurrency()
  return <>{formatPricePerK(amount)}</>
}
