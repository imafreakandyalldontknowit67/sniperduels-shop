import { getCurrentUser } from '@/lib/auth'
import { getUserOrders } from '@/lib/storage'
import { ShoppingBag } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  processing: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  refunded: 'bg-gray-500/20 text-gray-400',
}

export default async function OrdersPage() {
  const user = await getCurrentUser()
  const orders = user ? await getUserOrders(user.id) : []

  // Sort by most recent first
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Orders</h1>
        <p className="text-gray-400 mt-1">View your purchase history</p>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="bg-dark-800/50 rounded-xl p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No orders yet</h3>
          <p className="text-gray-400">
            When you make a purchase, it will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-dark-800/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Item</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Type</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Qty</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Total</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {sortedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-dark-600/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <Link href={`/dashboard/orders/${order.id}`} className="hover:text-white transition-colors">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    <Link href={`/dashboard/orders/${order.id}`} className="hover:text-accent transition-colors">
                      {order.itemName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 capitalize">
                    {order.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    ${order.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/orders/${order.id}`}>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {order.status}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
