import { getOrders } from '@/lib/storage'
import { OrdersTable } from '@/components/admin/OrdersTable'

export default async function OrdersPage() {
  const orders = (await getOrders()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Orders</h1>
      <OrdersTable initialOrders={orders} />
    </div>
  )
}
