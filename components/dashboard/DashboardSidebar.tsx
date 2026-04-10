'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingBag,
  UserCircle,
  Crosshair,
  ArrowLeft,
  Plus,
  Menu,
  X,
  Store,
  ArrowDownToLine,
  ArrowUpRight,
  TrendingUp,
  Banknote,
} from 'lucide-react'
import { CurrencySelector } from '@/components/ui'

const customerItems = [
  { href: '/dashboard/orders', label: 'My Orders', icon: ShoppingBag },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Plus },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
]

const vendorItems = [
  { href: '/dashboard/vendor', label: 'Overview', icon: Store },
  { href: '/dashboard/vendor/deposit', label: 'Deposit Gems', icon: ArrowDownToLine },
  { href: '/dashboard/vendor/withdraw', label: 'Withdraw Gems', icon: ArrowUpRight },
  { href: '/dashboard/vendor/earnings', label: 'Earnings', icon: TrendingUp },
  { href: '/dashboard/vendor/payouts', label: 'Cash Out', icon: Banknote },
]

export function DashboardSidebar({ isVendor = false }: { isVendor?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/dashboard/vendor') return pathname === '/dashboard/vendor'
    return pathname === href || pathname.startsWith(href + '/')
  }

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
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-dark-800 flex flex-col z-50 transition-transform duration-200 ${
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-accent" />
            <span className="text-lg font-bold text-white">
              My Account
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {customerItems.map((item) => {
              const active = isActive(item.href)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
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

          {isVendor && (
            <>
              <div className="my-4 px-4 flex items-center gap-2">
                <div className="flex-1 h-px bg-dark-600" />
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Vendor</span>
                <div className="flex-1 h-px bg-dark-600" />
              </div>

              <ul className="space-y-2">
                {vendorItems.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          active
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
            </>
          )}
        </nav>

        {/* Currency + Back to Site */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-gray-500 uppercase">Currency</span>
            <CurrencySelector />
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Shop
          </Link>
        </div>
      </aside>
    </>
  )
}
