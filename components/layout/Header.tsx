'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { NAV_LINKS } from '@/lib/constants'
import { Menu, X, LogOut, Shield, User, Eye, EyeOff, ChevronDown, ShoppingBag, UserCircle, Check, Wallet, Plus, ArrowDownToLine, Crown } from 'lucide-react'
import { useAuth } from '@/components/providers'
import { LOYALTY_TIERS } from '@/lib/loyalty'
import { PixelButton } from '@/components/ui'

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [balanceHidden, setBalanceHidden] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { user, isAdmin, isViewingAsConsumer, isLoading, discordLinked, discordUsername, walletBalance, loyaltyTier, loyaltyDiscount, login, logout, toggleViewMode } = useAuth()

  const showAdminFeatures = isAdmin && !isViewingAsConsumer

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isAppSection = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')
  if (isAppSection) return null

  return (
    <header className="fixed top-0 left-0 right-0 z-50" style={{ background: '#0a0a0b' }}>
      <nav className="w-full mx-auto px-3 sm:px-5 lg:px-8">
        <div className="relative flex items-center justify-between h-[56px] sm:h-[64px] md:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <img
              src="/images/logo.png"
              alt="Sniper Duels Shop"
              className="h-12 sm:h-16 md:h-20 w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`uppercase tracking-wider text-base font-bold transition-colors pixel-underline ${
                  pathname === link.href ? 'text-white pixel-underline-active' : 'text-pixel-blue hover:text-pixel-blue-light'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {showAdminFeatures && (
              <Link
                href="/admin"
                className="text-accent hover:text-accent-light uppercase tracking-wider text-sm flex items-center gap-1"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <div className="w-40 h-10 bg-dark-700 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border-[2px] border-dark-500"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-6 h-6" />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-xs text-white uppercase">{user.displayName}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-dark-800 border-[2px] border-accent shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b-[2px] border-dark-600">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-white uppercase">{user.displayName}</p>
                        {loyaltyTier !== 'member' && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${
                            loyaltyTier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-400/20 text-gray-300'
                          }`}>
                            <Crown className="w-3 h-3" />
                            {LOYALTY_TIERS[loyaltyTier].label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">@{user.name}</p>
                      {loyaltyDiscount > 0 && (
                        <p className="text-xs text-accent mt-1">{(loyaltyDiscount * 100).toFixed(0)}% loyalty discount</p>
                      )}
                    </div>

                    <div className="px-4 py-3 border-b-[2px] border-dark-600">
                      <p className="text-xs text-gray-400 mb-1 uppercase">Balance</p>
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => setBalanceHidden(!balanceHidden)}
                          className="text-gray-400 hover:text-white"
                        >
                          {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <span className="text-lg font-bold text-accent">
                          {balanceHidden ? '------' : `$${walletBalance.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href="/dashboard/deposit"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-light text-black text-xs font-medium uppercase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Deposit
                        </Link>
                        <a
                          href="https://discord.gg/sniperduels"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-600 hover:bg-dark-500 text-white text-xs font-medium uppercase"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          Withdraw
                        </a>
                      </div>
                    </div>

                    <div className="py-2">
                      <Link
                        href="/dashboard/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white uppercase"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        My Orders
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white uppercase"
                      >
                        <UserCircle className="w-4 h-4" />
                        Profile
                      </Link>
                      {discordLinked ? (
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white uppercase"
                        >
                          <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
                          <span className="flex-1">Discord</span>
                          <Check className="w-3 h-3 text-green-400" />
                        </Link>
                      ) : (
                        <Link
                          href="/api/auth/discord"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white uppercase"
                        >
                          <DiscordIcon className="w-4 h-4" />
                          Link Discord
                        </Link>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="py-2 border-t-[2px] border-dark-600">
                        {showAdminFeatures && (
                          <Link
                            href="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-xs text-accent hover:bg-dark-700 uppercase"
                          >
                            <Shield className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            toggleViewMode()
                            setUserDropdownOpen(false)
                          }}
                          className={`flex items-center gap-3 px-4 py-2 text-xs w-full text-left uppercase ${isViewingAsConsumer ? 'text-accent hover:bg-dark-700' : 'text-gray-300 hover:bg-dark-700 hover:text-white'}`}
                        >
                          {isViewingAsConsumer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          {isViewingAsConsumer ? 'Switch to Admin View' : 'View as Consumer'}
                        </button>
                      </div>
                    )}

                    <div className="py-2 border-t-[2px] border-dark-600">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false)
                          logout()
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-xs text-gray-300 hover:bg-dark-700 hover:text-white w-full text-left uppercase"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={login} className="relative inline-flex items-center justify-center pixel-btn-press" style={{ textDecoration: 'none' }}>
                <img src="/images/pixel/pngs/asset-64.png" alt="" className="h-[41px] w-auto" />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[9px] uppercase tracking-wider">
                  Login with Roblox
                </span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t-[2px] border-dark-600">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`uppercase tracking-wider text-sm py-2 ${
                    pathname === link.href ? 'text-white' : 'text-pixel-blue hover:text-pixel-blue-light'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <div className="flex items-center gap-2 pt-2 border-t-[2px] border-dark-600">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-8 h-8" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      <p className="text-white font-medium text-xs uppercase">{user.displayName}</p>
                      <p className="text-xs text-gray-400">@{user.name}</p>
                    </div>
                  </div>

                  <div className="py-3 px-4 bg-dark-700 border-[2px] border-dark-500">
                    <p className="text-xs text-gray-400 mb-1 uppercase">Balance</p>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setBalanceHidden(!balanceHidden)}
                        className="text-gray-400 hover:text-white"
                      >
                        {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <span className="text-lg font-bold text-accent">
                        {balanceHidden ? '------' : `$${walletBalance.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="/dashboard/deposit"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-light text-black text-xs font-medium uppercase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Deposit
                      </Link>
                      <a
                        href="https://discord.gg/sniperduels"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-dark-600 hover:bg-dark-500 text-white text-xs font-medium uppercase"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        Withdraw
                      </a>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-gray-300 hover:text-white text-xs uppercase"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    My Orders
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 py-2 text-gray-300 hover:text-white text-xs uppercase"
                  >
                    <UserCircle className="w-4 h-4" />
                    Profile
                  </Link>
                  {discordLinked ? (
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-gray-300 hover:text-white text-xs uppercase"
                    >
                      <DiscordIcon className="w-4 h-4 text-[#5865F2]" />
                      <span>Discord</span>
                      <Check className="w-3 h-3 text-green-400 ml-1" />
                    </Link>
                  ) : (
                    <Link
                      href="/api/auth/discord"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-gray-300 hover:text-white text-xs uppercase"
                    >
                      <DiscordIcon className="w-4 h-4" />
                      Link Discord
                    </Link>
                  )}

                  {showAdminFeatures && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-2 text-accent hover:text-accent-light text-xs uppercase"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Panel
                    </Link>
                  )}
                  {isAdmin && (
                    <button
                      onClick={toggleViewMode}
                      className={`flex items-center gap-2 py-2 text-xs uppercase ${isViewingAsConsumer ? 'text-accent hover:text-accent-light' : 'text-gray-300 hover:text-white'}`}
                    >
                      {isViewingAsConsumer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {isViewingAsConsumer ? 'Switch to Admin View' : 'View as Consumer'}
                    </button>
                  )}

                  <button
                    onClick={logout}
                    className="flex items-center gap-2 py-2 text-gray-300 hover:text-white text-xs uppercase"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <button onClick={login} className="relative inline-flex items-center justify-center w-full mt-2 pixel-btn-press" style={{ textDecoration: 'none' }}>
                  <img src="/images/pixel/pngs/asset-64.png" alt="" className="h-[52px] w-auto" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] uppercase tracking-wider">
                    Login with Roblox
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
