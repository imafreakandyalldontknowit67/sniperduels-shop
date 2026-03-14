import { getOrderStats, getUsers, getStock, getGemStock } from '@/lib/storage'
import {
  DollarSign,
  Gem,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react'

export default async function AdminDashboard() {
  const stats = await getOrderStats()
  const users = await getUsers()
  const stock = await getStock()
  const gemStock = await getGemStock()

  const statsCards = [
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Orders',
      value: stats.total,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Pending Orders',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Gem Stock',
      value: `${gemStock.toLocaleString()}k`,
      icon: Gem,
      color: gemStock > 0 ? 'text-accent' : 'text-red-500',
      bgColor: gemStock > 0 ? 'bg-accent/10' : 'bg-red-500/10',
    },
    {
      label: 'Stock Items',
      value: stock.length,
      icon: Package,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Orders Today',
      value: stats.todayOrders,
      icon: TrendingUp,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-dark-800/50 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-dark-800/50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Stats</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-dark-700">
            <span className="text-gray-400">Orders this week</span>
            <span className="text-white font-semibold">{stats.weekOrders}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-dark-700">
            <span className="text-gray-400">Orders this month</span>
            <span className="text-white font-semibold">{stats.monthOrders}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-dark-700">
            <span className="text-gray-400">Completed orders</span>
            <span className="text-green-500 font-semibold">{stats.completed}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-400">Active stock items</span>
            <span className="text-white font-semibold">
              {stock.filter(s => s.active).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
