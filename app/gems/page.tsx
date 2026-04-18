'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { Minus, Plus, X, Wallet, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { PixelButton } from '@/components/ui'
import { useCurrency } from '@/components/providers'

interface GemListing {
  id: string
  vendorId: string | null
  pricePerK: number
  minOrderK: number
  maxOrderK: number
  stockK: number
  bulkTiers: Array<{ minK: number; pricePerK: number }> | null
  type: 'platform' | 'vendor'
}

const PRESET_AMOUNTS = [10, 25, 50, 100]

interface UserInfo {
  user: { id: string; name: string } | null
  walletBalance: number
  loyaltyDiscount: number
  canUseDiscordDiscount: boolean
}

export default function GemsPage() {
  const router = useRouter()
  const { formatPrice, formatPricePerK, isUsd, currency } = useCurrency()
  const [amount, setAmount] = useState(5)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [listings, setListings] = useState<GemListing[]>([])
  const [selectedListing, setSelectedListing] = useState<GemListing | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [botOnline, setBotOnline] = useState(true)

  useEffect(() => {
    fetchUser()
    fetchListings()
    fetchBotStatus()
  }, [])

  async function fetchBotStatus() {
    try {
      const res = await fetch('/api/bot/status')
      if (res.ok) {
        const data = await res.json()
        setBotOnline(data.online)
      }
    } catch { /* assume online */ }
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUserInfo({
            user: data.user,
            walletBalance: data.walletBalance || 0,
            loyaltyDiscount: data.loyaltyDiscount || 0,
            canUseDiscordDiscount: data.canUseDiscordDiscount || false,
          })
        }
      }
    } catch { /* Not logged in */ }
  }

  async function fetchListings() {
    try {
      const res = await fetch('/api/gems/listings')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings)
        // Auto-select cheapest with enough stock for default amount
        if (data.listings.length > 0) {
          const available = data.listings.filter((l: GemListing) => l.stockK >= amount && amount >= l.minOrderK && amount <= l.maxOrderK)
          setSelectedListing(available[0] || data.listings.filter((l: GemListing) => l.stockK > 0)[0] || data.listings[0])
        }
      }
    } catch { /* fallback */ }
  }

  function getEffectiveRate(listing: GemListing, amountK: number): number {
    if (listing.bulkTiers && listing.bulkTiers.length > 0) {
      const sorted = [...listing.bulkTiers].sort((a, b) => b.minK - a.minK)
      const tier = sorted.find(t => amountK >= t.minK)
      if (tier) return tier.pricePerK
    }
    return listing.pricePerK
  }

  const handleAmountChange = (newAmount: number) => {
    if (newAmount >= 1 && newAmount <= 500) {
      setAmount(newAmount)
      // Auto-switch listing if current one can't fulfill the new amount
      if (selectedListing && (selectedListing.stockK < newAmount || newAmount < selectedListing.minOrderK || newAmount > selectedListing.maxOrderK)) {
        const best = listings.find(l => l.stockK >= newAmount && newAmount >= l.minOrderK && newAmount <= l.maxOrderK)
        if (best) setSelectedListing(best)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') { setAmount(0); return }
    const value = parseInt(raw)
    if (!isNaN(value) && value >= 0 && value <= 500) {
      setAmount(value)
    }
  }

  const currentRate = selectedListing ? getEffectiveRate(selectedListing, amount) : 2.90
  const totalPrice = Math.round(amount * currentRate * 100) / 100
  const isVendorSelected = selectedListing?.type === 'vendor'
  const combinedDiscount = isVendorSelected ? 0 : (userInfo?.loyaltyDiscount || 0) + (userInfo?.canUseDiscordDiscount ? 0.025 : 0)
  const discountedPrice = combinedDiscount > 0
    ? Math.round(totalPrice * (1 - combinedDiscount) * 100) / 100
    : totalPrice

  const totalStockK = listings.reduce((sum, l) => sum + l.stockK, 0)
  const selectedStockK = selectedListing?.stockK ?? 0
  const cheapestRate = listings.length > 0
    ? Math.min(...listings.filter(l => l.stockK > 0).map(l => l.pricePerK))
    : 2.90

  function handlePurchaseClick() {
    posthog.capture('gems_buy_clicked', { amount_k: amount, total_price: discountedPrice })
    if (!userInfo?.user) {
      posthog.capture('gems_buy_blocked', { reason: 'not_logged_in', amount_k: amount })
      setToast({ type: 'error', text: 'You need to login first to purchase gems.' })
      return
    }
    if (!botOnline) {
      posthog.capture('gems_buy_blocked', { reason: 'bot_offline', amount_k: amount })
      setToast({ type: 'error', text: 'The trade bot is currently offline. Join our Discord for updates!' })
      return
    }
    if (userInfo.walletBalance < discountedPrice) {
      posthog.capture('gems_buy_blocked', { reason: 'insufficient_balance', amount_k: amount, balance: userInfo.walletBalance, required: discountedPrice })
    }
    setAgreedToTerms(false)
    setShowConfirm(true)
    posthog.capture('gems_confirm_modal_opened', { amount_k: amount, total_price: discountedPrice })
  }

  async function handleConfirmPurchase() {
    if (!userInfo || !selectedListing) return

    setPurchasing(true)
    try {
      const res = await fetch('/api/orders/purchase-gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInK: amount,
          vendorListingId: selectedListing.type === 'vendor' ? selectedListing.vendorId : 'platform',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        posthog.capture('gems_purchase_failed', { amount_k: amount, error: data.error })
        if (data.error === 'Insufficient wallet balance') {
          setToast({ type: 'error', text: `Not enough balance (${formatPrice(data.balance)}). Add funds first!` })
        } else if (data.error?.includes('stock')) {
          setToast({ type: 'error', text: data.error })
          fetchListings() // Refresh stock
        } else {
          setToast({ type: 'error', text: data.error || 'Purchase failed' })
        }
        setShowConfirm(false)
        return
      }

      posthog.capture('gems_purchased', { amount_k: amount, total_price: discountedPrice })
      router.push(`/dashboard/orders/${data.order.id}`)
    } catch {
      posthog.capture('gems_purchase_failed', { amount_k: amount, error: 'network_error' })
      setToast({ type: 'error', text: 'Something went wrong' })
      setShowConfirm(false)
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* Toast */}
        {toast && (
          <div
            className="fixed top-20 right-4 z-50 p-3 sm:p-4 max-w-[calc(100vw-2rem)] sm:max-w-sm"
            style={{
              background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `2px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
              color: toast.type === 'success' ? '#4ade80' : '#f87171',
              boxShadow: '4px 4px 0px #000',
            }}
          >
            <div className="flex items-start gap-3">
              <p className="text-xs flex-1 uppercase">{toast.text}</p>
              <button onClick={() => setToast(null)} className="text-current opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!botOnline && (
          <div className="mb-6 p-4 text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}>
            <p className="text-red-400 text-xs uppercase font-bold mb-1">Trade bot is offline</p>
            <p className="text-gray-400 text-[10px]">
              Purchases are unavailable right now.{' '}
              <a href="https://discord.gg/sniperduels" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Join our Discord
              </a>{' '}
              to know when it&apos;s back!
            </p>
          </div>
        )}

        {!isUsd && (
          <p className="text-[10px] text-gray-500 mb-4 text-center uppercase">Prices shown in {currency} are approximate.</p>
        )}

        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-accent mb-3 sm:mb-4 uppercase">
            Gems
          </h1>

          {totalStockK > 0 && (
            <div className="flex items-center justify-center gap-3 mt-2">
              <div
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase"
                style={{
                  border: `2px solid ${totalStockK === 0 ? '#ef4444' : totalStockK <= 50 ? '#eab308' : '#22c55e'}`,
                  color: totalStockK === 0 ? '#f87171' : totalStockK <= 50 ? '#facc15' : '#4ade80',
                }}
              >
                <span
                  className="w-2 h-2"
                  style={{ background: totalStockK === 0 ? '#f87171' : totalStockK <= 50 ? '#facc15' : '#4ade80' }}
                />
                {totalStockK === 0 ? 'Out of stock' : `${totalStockK.toLocaleString()}k gems available`}
              </div>
              {cheapestRate < 2.90 && (
                <span className="text-[10px] sm:text-xs text-accent uppercase font-bold">
                  From {formatPricePerK(cheapestRate)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          {/* Left column - Selection */}
          <div>
            {/* Quick Select Buttons */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-[10px] sm:text-xs text-white mb-2 sm:mb-3 uppercase font-bold">Quick Select</label>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAmountChange(preset)}
                    className={`relative inline-flex items-center justify-center pixel-btn-press ${amount !== preset ? 'opacity-50' : ''}`}
                  >
                    <img
                      src="/images/pixel/pngs/asset-62.png"
                      alt=""
                      className="w-full h-[36px] sm:h-[40px]"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[9px] sm:text-[10px] uppercase tracking-wider">
                      {preset}k
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-[10px] sm:text-xs text-white mb-2 sm:mb-3 uppercase font-bold">Custom Amount (in thousands)</label>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => handleAmountChange(amount - 1)}
                  disabled={amount <= 1}
                  className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src="/images/pixel/pngs/asset-63.png" alt="" className="h-[36px] sm:h-[40px] w-auto" />
                  <Minus className="absolute w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={handleInputChange}
                    min={1}
                    max={500}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-center text-lg sm:text-xl font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ background: '#1a1a1e', border: '3px solid #2a2a2e' }}
                  />
                  <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base uppercase">k</span>
                </div>
                <button
                  onClick={() => handleAmountChange(amount + 1)}
                  disabled={amount >= 500}
                  className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src="/images/pixel/pngs/asset-63.png" alt="" className="h-[36px] sm:h-[40px] w-auto" />
                  <Plus className="absolute w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Price Display */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <span className="text-white text-[10px] sm:text-xs uppercase font-bold">Amount</span>
                <span className="text-white font-bold text-xs sm:text-sm">{amount.toLocaleString()} k</span>
              </div>
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <span className="text-white text-[10px] sm:text-xs uppercase font-bold">Rate</span>
                <span className="text-white font-bold text-xs sm:text-sm">{formatPricePerK(currentRate)}</span>
              </div>
              {combinedDiscount > 0 && (
                <>
                  {userInfo?.canUseDiscordDiscount && (
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <span className="text-gray-400 text-[10px] sm:text-xs uppercase">Discord First Purchase</span>
                      <span className="text-green-400 text-xs sm:text-sm">-2.5%</span>
                    </div>
                  )}
                  {userInfo?.loyaltyDiscount ? (
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <span className="text-gray-400 text-[10px] sm:text-xs uppercase">Loyalty Discount</span>
                      <span className="text-green-400 text-xs sm:text-sm">-{parseFloat((userInfo.loyaltyDiscount * 100).toFixed(1))}%</span>
                    </div>
                  ) : null}
                </>
              )}
              <div className="pt-3 mt-3" style={{ borderTop: '1px solid #4b5563' }}>
                <div className="flex justify-between items-center">
                  <span className="text-white text-xs sm:text-sm uppercase font-bold">Total</span>
                  <span className="text-lg sm:text-xl font-bold text-white">{formatPrice(discountedPrice)}</span>
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="flex justify-center">
              <button
                onClick={handlePurchaseClick}
                disabled={selectedStockK < amount}
                className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img
                  src="/images/pixel/pngs/asset-88.png"
                  alt=""
                  className="h-[52px] sm:h-[58px] w-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider">
                  {totalStockK === 0
                    ? 'Out of Stock'
                    : selectedStockK < amount
                      ? `Only ${selectedStockK.toLocaleString()}k available`
                      : 'Finish Purchase'
                  }
                </span>
              </button>
            </div>
          </div>

          {/* Right column - Pricing Selector */}
          <div>
            {/* Vendor/Platform Price Selector */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-accent mb-2 uppercase text-center">Select Price</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs uppercase text-center mb-4 sm:mb-6">Choose a price tier &mdash; cheapest first</p>
              <div className="space-y-2 sm:space-y-3">
                {listings.filter(l => amount >= l.minOrderK && amount <= l.maxOrderK).map((listing) => {
                  const rate = getEffectiveRate(listing, amount)
                  const isSelected = selectedListing?.id === listing.id
                  const hasStock = listing.stockK >= amount
                  const inRange = amount >= listing.minOrderK && amount <= listing.maxOrderK
                  const hasBulk = listing.bulkTiers && listing.bulkTiers.length > 0
                  // For display, include base price as a tier so the dropdown shows the full range
                  const allTiers = hasBulk
                    ? [{ minK: 1, pricePerK: listing.pricePerK }, ...listing.bulkTiers!.filter(t => t.pricePerK !== listing.pricePerK)]
                    : null
                  const lowestRate = hasBulk
                    ? Math.min(listing.pricePerK, ...listing.bulkTiers!.map(t => t.pricePerK))
                    : listing.pricePerK

                  return (
                    <div key={listing.id} className={!hasStock || !inRange ? 'opacity-40' : ''}>
                      <button
                        onClick={() => { if (hasStock && inRange) setSelectedListing(listing) }}
                        disabled={!hasStock || !inRange}
                        className={`w-full flex justify-between items-center px-4 sm:px-5 py-3 sm:py-4 text-left transition-colors`}
                        style={{
                          border: `2px solid ${isSelected ? '#e1ad2d' : '#2a2a2e'}`,
                          background: isSelected ? 'rgba(225,173,45,0.05)' : 'transparent',
                        }}
                      >
                        <div>
                          <span
                            className="text-xs sm:text-sm uppercase block"
                            style={{ color: isSelected ? '#ffffff' : '#9ca3af', fontWeight: isSelected ? 'bold' : 'normal' }}
                          >
                            {listing.type === 'platform' ? 'Official Stock' : 'Vendor'}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {listing.stockK > 0 ? `${listing.stockK}k available` : 'Out of stock'}
                            {listing.minOrderK > 1 && ` · Min ${listing.minOrderK}k`}
                          </span>
                        </div>
                        <div className="text-right">
                          <span
                            className="text-xs sm:text-sm block"
                            style={{ color: isSelected ? '#e1ad2d' : '#d1d5db', fontWeight: isSelected ? 'bold' : 'normal' }}
                          >
                            {formatPricePerK(rate)}
                          </span>
                          {hasBulk && rate > lowestRate && (
                            <span className="text-[10px] text-green-400">
                              as low as {formatPricePerK(lowestRate)}
                            </span>
                          )}
                        </div>
                      </button>
                      {/* Show bulk tier breakdown when selected */}
                      {isSelected && hasBulk && (
                        <div
                          className="px-4 sm:px-5 pb-3 pt-1"
                          style={{
                            border: '2px solid #e1ad2d',
                            borderTop: 'none',
                            background: 'rgba(225,173,45,0.05)',
                          }}
                        >
                          <p className="text-[10px] text-gray-500 uppercase mb-2">Pricing tiers</p>
                          {allTiers!
                            .sort((a, b) => a.minK - b.minK)
                            .map((tier, i, arr) => {
                              const isActiveTier = rate === tier.pricePerK
                              return (
                                <div
                                  key={i}
                                  className="flex justify-between items-center py-1"
                                >
                                  <span className={`text-[10px] ${isActiveTier ? 'text-accent font-bold' : 'text-gray-400'}`}>
                                    {tier.minK}k{i < arr.length - 1
                                      ? `–${arr[i + 1].minK - 1}k`
                                      : '+'}
                                  </span>
                                  <span className={`text-[10px] ${isActiveTier ? 'text-accent font-bold' : 'text-gray-400'}`}>
                                    {formatPricePerK(tier.pricePerK)}
                                    {isActiveTier && ' ←'}
                                  </span>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Wallet Balance Bar */}
            {userInfo?.user && (
              <div
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 mt-6 sm:mt-8"
                style={{ background: '#1a1a1e', border: '2px solid #e1ad2d' }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  <span className="text-gray-400 text-[10px] sm:text-xs uppercase">Balance:</span>
                  <span className="text-white font-semibold text-xs sm:text-sm">{formatPrice(userInfo.walletBalance)}</span>
                </div>
                <Link
                  href="/dashboard/deposit"
                  className="relative inline-flex items-center justify-center pixel-btn-press"
                  style={{ textDecoration: 'none' }}
                >
                  <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[40px] sm:h-[44px] w-auto" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[9px] sm:text-[10px] uppercase tracking-wider">
                    Add Funds
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && userInfo && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-md p-4 sm:p-6" style={{ background: '#1a1a1e', border: '3px solid #e1ad2d', boxShadow: '4px 4px 0px #000' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-accent uppercase">Confirm Gems Purchase</h3>
              <button onClick={() => { posthog.capture('gems_confirm_modal_closed', { amount_k: amount, total_price: discountedPrice, reason: 'dismissed' }); setShowConfirm(false) }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Gems</span>
                <span className="text-white font-medium text-sm">{amount.toLocaleString()}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Source</span>
                <span className="text-white font-medium text-sm">
                  {selectedListing.type === 'platform' ? 'Official Stock' : 'Vendor'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Price</span>
                <span className="text-white font-medium text-sm">{formatPrice(discountedPrice)}</span>
              </div>
              {!isVendorSelected && userInfo.canUseDiscordDiscount && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase">Discord First Purchase</span>
                  <span className="text-green-400 text-sm">-2.5%</span>
                </div>
              )}
              {!isVendorSelected && userInfo.loyaltyDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase">Loyalty Discount</span>
                  <span className="text-green-400 text-sm">-{parseFloat((userInfo.loyaltyDiscount * 100).toFixed(1))}%</span>
                </div>
              )}
              <div className="border-t-[2px] border-dark-600 pt-3 flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Current Balance</span>
                <span className="text-white text-sm">{formatPrice(userInfo.walletBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">After Purchase</span>
                <span className={`font-medium text-sm ${
                  userInfo.walletBalance >= discountedPrice ? 'text-white' : 'text-red-400'
                }`}>
                  {formatPrice(userInfo.walletBalance - discountedPrice)}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => { setAgreedToTerms(e.target.checked); if (e.target.checked) posthog.capture('terms_agreed', { page: 'gems' }) }}
                className="mt-0.5 w-4 h-4 accent-accent shrink-0"
              />
              <span className="text-[10px] text-gray-400 leading-tight">
                I agree that{' '}
                <Link href="/terms" className="text-accent hover:underline" target="_blank">all sales are final</Link>
                {' '}and non-refundable once delivered. Filing a dispute or chargeback will result in a permanent ban. Issues?{' '}
                <a href="https://discord.gg/sniperduels" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">Open a ticket in our Discord</a>.
              </span>
            </label>

            {userInfo.walletBalance < discountedPrice ? (
              <div className="space-y-3">
                <p className="text-red-400 text-xs text-center uppercase">Insufficient balance</p>
                <Link
                  href="/dashboard/deposit"
                  className="relative inline-flex items-center justify-center pixel-btn-press w-full"
                  style={{ textDecoration: 'none' }}
                >
                  <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[48px] sm:h-[52px] w-auto" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider">
                    Add Funds
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { posthog.capture('gems_confirm_modal_closed', { amount_k: amount, total_price: discountedPrice, reason: 'cancelled' }); setShowConfirm(false) }}
                  className="flex-1 relative h-[42px] bg-no-repeat bg-center bg-contain border-0 cursor-pointer active:scale-95 transition-transform"
                  style={{ backgroundImage: 'url(/images/pixel/pngs/asset-60.png)', backgroundSize: '100% 100%' }}
                >
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
                    Cancel
                  </span>
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={purchasing || !agreedToTerms}
                  className="flex-1 relative h-[42px] bg-no-repeat bg-center bg-contain border-0 cursor-pointer active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundImage: 'url(/images/pixel/pngs/asset-59.png)', backgroundSize: '100% 100%' }}
                >
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[8px] sm:text-[10px] uppercase tracking-wider">
                    {purchasing ? 'Buying...' : 'Confirm Purchase'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
