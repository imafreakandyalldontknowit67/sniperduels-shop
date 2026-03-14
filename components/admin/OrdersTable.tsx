'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ShoppingCart, MoreVertical, Check, XCircle, Trash2 } from 'lucide-react'
import type { Order } from '@/lib/storage'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  processing: 'bg-blue-500/20 text-blue-500',
  completed: 'bg-green-500/20 text-green-500',
  failed: 'bg-red-500/20 text-red-500',
  refunded: 'bg-gray-500/20 text-gray-500',
}

interface OrdersTableProps {
  initialOrders: Order[]
}

export function OrdersTable({ initialOrders }: OrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [actionDropdownOpen, setActionDropdownOpen] = useState<string | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!actionDropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('[data-dropdown-trigger]')) {
        setActionDropdownOpen(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [actionDropdownOpen])

  const toggleDropdown = (orderId: string) => {
    if (actionDropdownOpen === orderId) {
      setActionDropdownOpen(null)
      return
    }

    const button = buttonRefs.current.get(orderId)
    if (button) {
      const rect = button.getBoundingClientRect()
      setDropdownPosition({
        top: rect.top - 8,
        left: rect.right - 192,
      })
    }
    setActionDropdownOpen(orderId)
  }

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length

  async function handleCancelAll() {
    if (!confirm(`Cancel all ${pendingCount} pending/processing orders? This will refund all users.`)) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/orders/cancel-stale', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        // Update all pending/processing orders to failed in local state
        setOrders(orders.map(o =>
          (o.status === 'pending' || o.status === 'processing')
            ? { ...o, status: 'failed' as const, notes: 'Mass cancelled by admin — wallet refunded' }
            : o
        ))
        alert(`Cancelled ${data.cancelled} order(s). All users refunded.`)
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to cancel orders')
      }
    } catch (error) {
      console.error('Failed to mass cancel:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isActionable = (order: Order) =>
    order.status === 'pending' || order.status === 'processing'

  async function handleComplete(orderId: string) {
    // Require admin to provide delivery proof or justification
    const reason = prompt(
      'Enter bot trade ID (if bot-delivered) or reason for manual completion:'
    )
    if (!reason || !reason.trim()) return

    setIsSubmitting(true)
    setActionDropdownOpen(null)

    // If it looks like a trade ID (alphanumeric), send as botTradeId; otherwise as reason
    const isTradeId = /^[a-zA-Z0-9_-]+$/.test(reason.trim()) && reason.trim().length > 8
    const body = isTradeId
      ? { botTradeId: reason.trim() }
      : { reason: reason.trim() }

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        setOrders(orders.map(o => o.id === orderId ? data.order : o))
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to complete order')
      }
    } catch (error) {
      console.error('Failed to complete order:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancel(orderId: string) {
    setIsSubmitting(true)
    setActionDropdownOpen(null)

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setOrders(orders.map(o => o.id === orderId ? data.order : o))
      }
    } catch (error) {
      console.error('Failed to cancel order:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Mass Cancel Button */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between p-4 mb-6 rounded-xl bg-dark-800/50 border border-dark-600">
          <div>
            <span className="text-white font-medium">{pendingCount} pending order{pendingCount !== 1 ? 's' : ''}</span>
            <span className="text-gray-400 text-sm ml-2">still waiting to be fulfilled</span>
          </div>
          <button
            onClick={handleCancelAll}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Cancel All & Refund
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-dark-800/50 rounded-xl p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No orders yet</h3>
          <p className="text-gray-400">Orders will appear here when customers make purchases.</p>
        </div>
      ) : (
        <div className="bg-dark-800/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Order ID</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Customer</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Item</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Total</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Status</th>
                <th className="px-3 md:px-6 py-4 text-left text-sm font-semibold text-gray-400">Date</th>
                <th className="px-3 md:px-6 py-4 text-right text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-dark-600/50">
                  <td className="px-3 md:px-6 py-4">
                    <span className="text-gray-400 font-mono text-sm">
                      {order.id.slice(0, 15)}...
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-white">{order.userName}</td>
                  <td className="px-3 md:px-6 py-4">
                    <div>
                      <div className="text-white">{order.itemName}</div>
                      <div className="text-gray-500 text-sm">
                        {order.quantity}x @ ${order.pricePerUnit.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-4 text-white font-semibold">
                    ${order.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                      statusColors[order.status] || statusColors.pending
                    }`}>
                      {order.status}
                    </span>
                    {order.notes && (
                      <p className="text-gray-500 text-xs mt-1 max-w-[200px] truncate" title={order.notes}>
                        {order.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-3 md:px-6 py-4 text-gray-400 text-sm">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 md:px-6 py-4 text-right">
                    {isActionable(order) ? (
                      <button
                        ref={(el) => {
                          if (el) buttonRefs.current.set(order.id, el)
                        }}
                        data-dropdown-trigger
                        onClick={() => toggleDropdown(order.id)}
                        disabled={isSubmitting}
                        className="p-2 text-gray-400 hover:text-white hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Actions Dropdown Portal */}
      {actionDropdownOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          data-dropdown
          className="fixed w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            transform: 'translateY(-100%)',
          }}
        >
          <button
            onClick={() => handleComplete(actionDropdownOpen)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <Check className="w-4 h-4 text-green-400" />
            Mark Completed
          </button>
          <button
            onClick={() => handleCancel(actionDropdownOpen)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            Cancel & Refund
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
