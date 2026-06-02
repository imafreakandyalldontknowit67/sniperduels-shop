'use client'

/**
 * Buyer's order tracking page. Polls /api/marketplace/orders/[orderId] every
 * 5s and shows delivery job progress: queued → bot_in_trade → completed.
 */
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Check, Loader2, AlertTriangle } from 'lucide-react'
import MarketplaceOutageBanner from '@/components/MarketplaceOutageBanner'

interface OrderStatus {
  order: {
    id: string
    status: string
    itemName: string
    totalPrice: string
    createdAt: string
  }
  delivery: {
    id: string
    status: string
    attempts: number
    lastError: string | null
    startedAt: string | null
    completedAt: string | null
  } | null
  vaultItem: {
    catalog: { name: string; type: string }
  } | null
}

const STEPS: Array<{ key: string; label: string }> = [
  { key: 'pending', label: 'Awaiting payment' },
  { key: 'processing', label: 'Queued — bot will start trade' },
  { key: 'bot_in_trade', label: 'Bot is in trade with you' },
  { key: 'completed', label: 'Delivered' },
]

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()
  const awaitPayment = searchParams.get('awaitPayment') === '1'
  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function poll() {
    const res = await fetch(`/api/marketplace/orders/${orderId}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Order not found'); return }
    setStatus(data)
  }

  useEffect(() => {
    poll()
    const iv = setInterval(poll, 5_000)
    return () => clearInterval(iv)
  }, [orderId])

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-red-900/30 border border-red-700 rounded p-4 text-red-200">{error}</div>
      </div>
    )
  }
  if (!status) {
    return <div className="max-w-2xl mx-auto p-8 text-gray-400">Loading order…</div>
  }

  const effectiveStatus = status.delivery?.status ?? status.order.status
  const failed = status.order.status === 'failed' || status.order.status === 'refunded'
  const completed = effectiveStatus === 'completed'
  const currentStepIndex = (() => {
    if (failed) return -1
    if (completed) return STEPS.length
    if (effectiveStatus === 'bot_in_trade') return 2
    if (effectiveStatus === 'queued' || status.order.status === 'processing') return 1
    return 0  // pending
  })()

  return (
    <div>
      <MarketplaceOutageBanner />
      <div className="max-w-2xl mx-auto p-6 md:p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Order {status.order.id.slice(0, 8)}</h1>
      <div className="text-gray-400 mb-6 font-mono">
        {status.vaultItem?.catalog.name ?? status.order.itemName} — ${status.order.totalPrice}
      </div>

      {awaitPayment && status.order.status === 'pending' && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-4 mb-4 text-yellow-200 text-sm">
          Waiting on Pandabase to confirm your payment. This page updates automatically.
        </div>
      )}

      {failed ? (
        <div className="bg-red-900/30 border border-red-700 rounded p-4 text-red-200">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <AlertTriangle className="w-5 h-5" /> Order {status.order.status}
          </div>
          {status.delivery?.lastError && (
            <div className="text-sm">Reason: {status.delivery.lastError}</div>
          )}
          <div className="text-sm mt-2">
            Your wallet has been credited back. You can browse again at <Link href="/marketplace" className="underline">/marketplace</Link>.
          </div>
        </div>
      ) : (
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const done = i < currentStepIndex
            const active = i === currentStepIndex
            return (
              <li key={s.key} className={`flex items-center gap-3 p-3 rounded border ${
                done ? 'bg-green-900/20 border-green-800' :
                active ? 'bg-blue-900/30 border-blue-700' :
                'bg-zinc-900 border-zinc-800'
              }`}>
                {done ? <Check className="w-5 h-5 text-green-400 shrink-0" /> :
                  active ? <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" /> :
                  <div className="w-5 h-5 rounded-full border border-zinc-600 shrink-0" />}
                <div>
                  <div className={`font-semibold ${done ? 'text-green-200' : active ? 'text-blue-200' : 'text-gray-400'}`}>
                    {s.label}
                  </div>
                  {active && i === 2 && (
                    <div className="text-xs text-blue-300 mt-1">
                      Make sure your Roblox client is open and you&apos;re in the bot&apos;s private server.
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {completed && (
        <div className="mt-6 bg-green-900/30 border border-green-700 rounded p-4 text-green-200">
          <Check className="w-5 h-5 inline mr-2" />
          Delivered. Enjoy your new item! Find more at{' '}
          <Link href="/marketplace" className="underline">/marketplace</Link>.
        </div>
      )}
      </div>
    </div>
  )
}
