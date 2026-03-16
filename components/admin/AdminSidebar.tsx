'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Gem,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Crosshair,
  ArrowLeft,
  Menu,
  X,
  BarChart3,
  TrendingDown,
  GitBranch,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/gems', label: 'Gems', icon: Gem },
  { href: '/admin/stock', label: 'Stock', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const analyticsItems = [
  { href: '/admin/analytics', label: 'Overview', icon: BarChart3 },
  { href: '/admin/analytics/funnels', label: 'Funnels', icon: GitBranch },
  { href: '/admin/analytics/dropoffs', label: 'Drop-offs', icon: TrendingDown },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-dark-800 rounded-lg text-gray-400 hover:text-white md:hidden"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-dark-800 flex flex-col z-40 transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}>
        {/* Close button (mobile) */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white md:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-accent" />
            <span className="text-lg font-bold text-white">
              Admin Panel
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href) && !pathname.startsWith('/admin/analytics'))
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-gray-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-6 pt-4 border-t border-dark-700">
            <span className="px-4 text-[10px] text-gray-500 uppercase font-bold tracking-wider">Analytics</span>
            <ul className="space-y-2 mt-2">
              {analyticsItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin/analytics' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-accent text-white'
                          : 'text-gray-400 hover:text-white hover:bg-dark-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>

        {/* Back to Site */}
        <div className="p-4">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Site
          </Link>
        </div>
      </aside>
    </>
  )
}
