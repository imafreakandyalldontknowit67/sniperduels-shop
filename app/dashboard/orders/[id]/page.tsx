'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Order } from '@/lib/storage'

const PRIVATE_SERVER_URL = process.env.NEXT_PUBLIC_PRIVATE_SERVER_URL || ''
const POLL_INTERVAL = 5000

interface OrderStatus {
  order: Order
  queuePosition: number | null
  estimatedMinutes: number | null
  totalInQueue: number
}

export default function OrderTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [status, setStatus] = useState<OrderStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [confirmingReady, setConfirmingReady] = useState(false)
  const [tradesEnabled, setTradesEnabled] = useState(false)
  const [inServer, setInServer] = useState(false)
  const prevStatusRef = useRef<string | null>(null)
  const routerRef = useRef(router)
  routerRef.current = router

  const canConfirm = tradesEnabled && inServer

  async function markPlayerReady() {
    if (!canConfirm) return
    setConfirmingReady(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      if (res.ok) {
        setToast({ type: 'info', text: 'Confirmed! The bot will find you in the server and start your trade.' })
        const statusRes = await fetch(`/api/orders/${orderId}/status`)
        if (statusRes.ok) {
          const data = await statusRes.json()
          setStatus(data)
        }
      } else {
        setToast({ type: 'error', text: 'Failed to confirm. Please try again.' })
      }
    } catch {
      setToast({ type: 'error', text: 'Connection error. Please try again.' })
    }
    setConfirmingReady(false)
  }

  // Single effect: initial fetch + polling via recursive setTimeout
  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    async function doFetch() {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`)
        if (cancelled) return

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            routerRef.current.push('/dashboard/orders')
            return
          }
          // Rate limited — back off and retry instead of showing error
          if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10)
            if (!cancelled) timeoutId = setTimeout(doFetch, retryAfter * 1000)
            return
          }
          setError('Failed to load order')
          setLoading(false)
          return
        }

        const data = await res.json()
        if (cancelled) return

        const newStatus = data.order.status

        // Detect status transitions and show toast
        if (prevStatusRef.current && prevStatusRef.current !== newStatus) {
          if (newStatus === 'failed') {
            setToast({
              type: 'error',
              text: `Order cancelled — $${data.order.totalPrice.toFixed(2)} has been refunded to your wallet.`,
            })
          } else if (newStatus === 'completed') {
            setToast({
              type: 'success',
              text: 'Your items have been delivered!',
            })
          } else if (newStatus === 'processing') {
            setToast({
              type: 'info',
              text: "It's your turn! Make sure you're in the private server.",
            })
          }
        }

        prevStatusRef.current = newStatus
        setStatus(data)
        setError(null)
        setLoading(false)

        // Schedule next poll for non-terminal states
        const terminalStates = ['completed', 'failed', 'refunded']
        if (!cancelled && !terminalStates.includes(newStatus)) {
          timeoutId = setTimeout(doFetch, POLL_INTERVAL)
        }
      } catch {
        if (cancelled) return
        setError('Failed to load order')
        setLoading(false)
      }
    }

    doFetch()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [orderId])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-400">{error || 'Order not found'}</p>
        <Link href="/dashboard/orders" className="text-accent hover:text-accent-light transition-colors">
          Back to Orders
        </Link>
      </div>
    )
  }

  const { order, queuePosition, estimatedMinutes } = status

  const toastColors = {
    success: 'bg-green-500/20 border-green-500/30 text-green-400',
    error: 'bg-red-500/20 border-red-500/30 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-4 z-50 p-4 rounded-xl shadow-lg border max-w-sm ${toastColors[toast.type]}`}>
          <div className="flex items-start gap-3">
            <p className="text-sm flex-1">{toast.text}</p>
            <button onClick={() => setToast(null)} className="text-current opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Pending — #1 in queue (ready) */}
      {order.status === 'pending' && queuePosition === 1 && (
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">You&apos;re Up Next!</h1>
          <p className="text-gray-400 mb-6">
            Join the private server and confirm when you&apos;re in.
          </p>

          {!order.playerReady ? (
            <>
              <div className="bg-dark-800/50 border border-dark-600 rounded-xl p-5 mb-4">
                <a
                  href={PRIVATE_SERVER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full py-3 mb-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl text-center transition-colors"
                >
                  Join Private Server
                </a>

                <p className="text-gray-400 text-sm mb-4">Before confirming, make sure:</p>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 cursor-pointer mb-3 transition-colors">
                  <input
                    type="checkbox"
                    checked={tradesEnabled}
                    onChange={(e) => setTradesEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-dark-500 text-accent focus:ring-accent bg-dark-600"
                  />
                  <div>
                    <span className="text-white text-sm font-medium">My trades are turned on</span>
                    <p className="text-gray-500 text-xs mt-0.5">Privacy settings must allow trades from everyone</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={inServer}
                    onChange={(e) => setInServer(e.target.checked)}
                    className="w-5 h-5 rounded border-dark-500 text-accent focus:ring-accent bg-dark-600"
                  />
                  <div>
                    <span className="text-white text-sm font-medium">I&apos;m in the private server</span>
                    <p className="text-gray-500 text-xs mt-0.5">You must be in the server for the bot to trade you</p>
                  </div>
                </label>
              </div>

              <button
                onClick={markPlayerReady}
                disabled={!canConfirm || confirmingReady}
                className={`w-full py-4 font-semibold rounded-xl text-center text-lg transition-colors mb-6 ${
                  canConfirm
                    ? 'bg-accent hover:bg-accent-light text-white'
                    : 'bg-dark-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                {confirmingReady ? 'Confirming...' : "I'm Ready"}
              </button>
            </>
          ) : (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 mb-6">
              <p className="text-green-400 text-sm font-medium">
                Confirmed! The bot is finding you in the server and will start your trade shortly.
              </p>
            </div>
          )}

          <OrderInfo order={order} />

          <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {order.playerReady ? 'Bot is looking for you in the server...' : 'Waiting for you to join and confirm...'}
          </div>
        </div>
      )}

      {/* Pending — Waiting in queue */}
      {order.status === 'pending' && queuePosition !== null && queuePosition > 1 && (
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Order Queued</h1>

          <div className="bg-dark-800/50 rounded-xl p-6 mt-6 mb-6">
            <div className="text-5xl font-bold text-accent mb-2">#{queuePosition}</div>
            <p className="text-gray-400 text-sm">in line</p>
            {estimatedMinutes !== null && (
              <p className="text-gray-500 text-sm mt-2">
                Estimated wait: ~{estimatedMinutes} minute{estimatedMinutes !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="bg-dark-800/50 border border-dark-600 rounded-xl p-5 mb-4">
            <a
              href={PRIVATE_SERVER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-3 mb-4 bg-accent hover:bg-accent-light text-white font-medium rounded-xl text-center transition-colors"
            >
              Join Private Server
            </a>

            {!order.playerReady && (
              <>
                <p className="text-gray-400 text-sm mb-3">Get ready while you wait:</p>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 cursor-pointer mb-3 transition-colors">
                  <input
                    type="checkbox"
                    checked={tradesEnabled}
                    onChange={(e) => setTradesEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-dark-500 text-accent focus:ring-accent bg-dark-600"
                  />
                  <span className="text-white text-sm">My trades are turned on</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 cursor-pointer mb-4 transition-colors">
                  <input
                    type="checkbox"
                    checked={inServer}
                    onChange={(e) => setInServer(e.target.checked)}
                    className="w-5 h-5 rounded border-dark-500 text-accent focus:ring-accent bg-dark-600"
                  />
                  <span className="text-white text-sm">I&apos;m in the private server</span>
                </label>

                <button
                  onClick={markPlayerReady}
                  disabled={!canConfirm || confirmingReady}
                  className={`w-full py-3 font-medium rounded-xl text-center transition-colors ${
                    canConfirm
                      ? 'bg-accent hover:bg-accent-light text-white'
                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {confirmingReady ? 'Confirming...' : "I'm Ready"}
                </button>
              </>
            )}

            {order.playerReady && (
              <p className="text-green-400 text-sm font-medium">Confirmed! The bot will trade you when it&apos;s your turn.</p>
            )}
          </div>

          <OrderInfo order={order} />

          <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-sm">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            Live updating...
          </div>
        </div>
      )}

      {/* Processing — Your Turn */}
      {order.status === 'processing' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Your Order Is Being Processed!</h1>
          <p className="text-gray-400 mb-6">
            The bot is preparing your trade right now.
          </p>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
            <p className="text-blue-400 text-sm font-medium mb-3">
              Make sure you&apos;re in the private server and accept the trade request!
            </p>
            <a
              href={PRIVATE_SERVER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full py-3 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-xl text-center transition-colors"
            >
              Join Private Server
            </a>
          </div>

          <p className="text-gray-500 text-xs mb-6">
            For maximum efficiency, please wait for the bot to send the trade first before leaving.
          </p>

          <OrderInfo order={order} />

          <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-sm">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Live updating...
          </div>
        </div>
      )}

      {/* Completed */}
      {order.status === 'completed' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Order Complete!</h1>
          <p className="text-gray-400 mb-6">Your items have been delivered.</p>

          <OrderInfo order={order} />

          {order.completedAt && (
            <p className="text-gray-500 text-sm mt-4">
              Delivered at {new Date(order.completedAt).toLocaleString()}
            </p>
          )}

          <div className="flex gap-3 mt-8">
            <Link
              href="/shop"
              className="flex-1 py-3 bg-accent hover:bg-accent-light text-white font-medium rounded-xl text-center transition-colors"
            >
              Back to Shop
            </Link>
            <Link
              href="/dashboard/orders"
              className="flex-1 py-3 bg-dark-600 hover:bg-dark-500 text-white font-medium rounded-xl text-center transition-colors"
            >
              View Orders
            </Link>
          </div>
        </div>
      )}

      {/* Failed */}
      {order.status === 'failed' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Order Failed</h1>
          <p className="text-gray-400 mb-6">
            Something went wrong with the delivery. Your wallet has been refunded (${order.totalPrice.toFixed(2)}).
          </p>

          {order.notes && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm">Reason: {order.notes}</p>
            </div>
          )}

          <OrderInfo order={order} />

          <div className="flex gap-3 mt-8">
            <Link
              href="/shop"
              className="flex-1 py-3 bg-accent hover:bg-accent-light text-white font-medium rounded-xl text-center transition-colors"
            >
              Back to Shop
            </Link>
            <Link
              href="/dashboard/orders"
              className="flex-1 py-3 bg-dark-600 hover:bg-dark-500 text-white font-medium rounded-xl text-center transition-colors"
            >
              View Orders
            </Link>
          </div>
        </div>
      )}

      {/* Refunded */}
      {order.status === 'refunded' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Order Refunded</h1>
          <p className="text-gray-400 mb-6">This order has been refunded.</p>

          <OrderInfo order={order} />

          <div className="mt-8">
            <Link
              href="/dashboard/orders"
              className="inline-block py-3 px-8 bg-dark-600 hover:bg-dark-500 text-white font-medium rounded-xl text-center transition-colors"
            >
              View Orders
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderInfo({ order }: { order: Order }) {
  return (
    <div className="bg-dark-800/50 rounded-xl p-4 text-left">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Order</span>
          <span className="text-gray-300">{order.itemName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Quantity</span>
          <span className="text-gray-300">{order.quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total</span>
          <span className="text-white font-medium">${order.totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Placed</span>
          <span className="text-gray-300">{new Date(order.createdAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
