'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, X, Wallet } from 'lucide-react'
import Link from 'next/link'
import { PixelButton } from '@/components/ui'

const PRICING_TIERS = [
  { min: 1, max: 9, rate: 2.90, label: '1k-9k' },
  { min: 10, max: 74, rate: 2.80, label: '10k-74k' },
  { min: 75, max: Infinity, rate: 2.65, label: '75k+' },
]

const PRESET_AMOUNTS = [10, 25, 50, 100]

function getRate(amountInK: number): number {
  const tier = PRICING_TIERS.find(t => amountInK >= t.min && amountInK <= t.max)
  return tier?.rate ?? PRICING_TIERS[0].rate
}

function calculatePrice(amountInK: number): number {
  return amountInK * getRate(amountInK)
}

function getCurrentTier(amountInK: number): typeof PRICING_TIERS[0] | undefined {
  return PRICING_TIERS.find(t => amountInK >= t.min && amountInK <= t.max)
}

interface UserInfo {
  user: { id: string; name: string } | null
  walletBalance: number
  loyaltyDiscount: number
  canUseDiscordDiscount: boolean
}

export default function GemsPage() {
  const router = useRouter()
  const [amount, setAmount] = useState(15)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [gemStock, setGemStock] = useState<number | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchUser()
    fetchGemStock()
  }, [])

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
    } catch {
      // Not logged in
    }
  }

  async function fetchGemStock() {
    try {
      const res = await fetch('/api/gems/stock')
      if (res.ok) {
        const data = await res.json()
        setGemStock(data.balanceInK)
      }
    } catch {
      // Non-critical
    }
  }

  const handleAmountChange = (newAmount: number) => {
    if (newAmount >= 1 && newAmount <= 500) {
      setAmount(newAmount)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1
    handleAmountChange(value)
  }

  function handlePurchaseClick() {
    if (!userInfo?.user) {
      window.location.href = '/api/auth/roblox'
      return
    }
    setShowConfirm(true)
  }

  async function handleConfirmPurchase() {
    if (!userInfo) return

    setPurchasing(true)
    try {
      const res = await fetch('/api/orders/purchase-gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountInK: amount }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'Insufficient wallet balance') {
          setToast({ type: 'error', text: `Not enough balance ($${data.balance.toFixed(2)}). Add funds first!` })
        } else if (data.error === 'Not enough gems in stock') {
          setToast({ type: 'error', text: `Only ${data.available}k gems available right now.` })
          setGemStock(data.available)
        } else {
          setToast({ type: 'error', text: data.error || 'Purchase failed' })
        }
        setShowConfirm(false)
        return
      }

      router.push(`/dashboard/orders/${data.order.id}`)
    } catch {
      setToast({ type: 'error', text: 'Something went wrong' })
      setShowConfirm(false)
    } finally {
      setPurchasing(false)
    }
  }

  const currentRate = getRate(amount)
  const totalPrice = calculatePrice(amount)
  const combinedDiscount = (userInfo?.loyaltyDiscount || 0) + (userInfo?.canUseDiscordDiscount ? 0.025 : 0)
  const discountedPrice = combinedDiscount > 0
    ? Math.round(totalPrice * (1 - combinedDiscount) * 100) / 100
    : totalPrice
  const currentTier = getCurrentTier(amount)

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

        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-accent mb-3 sm:mb-4 uppercase">
            Gems
          </h1>

          {gemStock !== null && (
            <div
              className="inline-flex items-center gap-2 mt-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase"
              style={{
                border: `2px solid ${gemStock === 0 ? '#ef4444' : gemStock <= 50 ? '#eab308' : '#22c55e'}`,
                color: gemStock === 0 ? '#f87171' : gemStock <= 50 ? '#facc15' : '#4ade80',
              }}
            >
              <span
                className="w-2 h-2"
                style={{ background: gemStock === 0 ? '#f87171' : gemStock <= 50 ? '#facc15' : '#4ade80' }}
              />
              {gemStock === 0 ? 'Out of stock' : `${gemStock.toLocaleString()}k gems in stock`}
            </div>
          )}
        </div>

        {/* Two column layout - stacks on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          {/* Left column - Selection */}
          <div>
            {/* Quick Select Buttons */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-[10px] sm:text-xs text-white mb-2 sm:mb-3 uppercase font-bold">Quick Select</label>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {PRESET_AMOUNTS.map((preset) => (
                  <PixelButton
                    key={preset}
                    variant="blue"
                    size="sm"
                    onClick={() => handleAmountChange(preset)}
                    className={amount !== preset ? 'opacity-50' : ''}
                    fullWidth
                  >
                    {preset}k
                  </PixelButton>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-[10px] sm:text-xs text-white mb-2 sm:mb-3 uppercase font-bold">Custom Amount (in thousands)</label>
              <div className="flex items-center gap-2 sm:gap-3">
                <PixelButton
                  variant="blue"
                  size="sm"
                  onClick={() => handleAmountChange(amount + 1)}
                  disabled={amount >= 500}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </PixelButton>
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
                <PixelButton
                  variant="blue"
                  size="sm"
                  onClick={() => handleAmountChange(amount - 1)}
                  disabled={amount <= 1}
                >
                  <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                </PixelButton>
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
                <span className="text-white font-bold text-xs sm:text-sm">$ {currentRate.toFixed(2)}/k</span>
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
                  <span className="text-lg sm:text-xl font-bold text-white">$ {discountedPrice.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Purchase Button */}
            <div className="flex justify-center">
              <PixelButton
                variant="gold"
                size="lg"
                onClick={handlePurchaseClick}
                disabled={gemStock !== null && gemStock < amount}
              >
                {gemStock !== null && gemStock === 0
                  ? 'Out of Stock'
                  : gemStock !== null && gemStock < amount
                    ? `Only ${gemStock.toLocaleString()}k available`
                    : 'Finish Purchase'
                }
              </PixelButton>
            </div>
          </div>

          {/* Right column - Pricing Tiers */}
          <div>
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-accent mb-2 uppercase text-center">Pricing Tiers</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs uppercase text-center mb-4 sm:mb-6">The more you buy, the better the price</p>
              <div className="space-y-2 sm:space-y-3">
                {PRICING_TIERS.map((tier) => {
                  const isActive = currentTier === tier
                  return (
                    <div
                      key={tier.label}
                      className="flex justify-between items-center px-4 sm:px-5 py-3 sm:py-4"
                      style={{
                        border: `2px solid ${isActive ? '#e1ad2d' : '#2a2a2e'}`,
                        background: isActive ? 'rgba(225,173,45,0.05)' : 'transparent',
                      }}
                    >
                      <span
                        className="text-xs sm:text-sm uppercase"
                        style={{ color: isActive ? '#ffffff' : '#9ca3af', fontWeight: isActive ? 'bold' : 'normal' }}
                      >
                        {tier.label}
                      </span>
                      <span
                        className="text-xs sm:text-sm"
                        style={{ color: isActive ? '#e1ad2d' : '#d1d5db', fontWeight: isActive ? 'bold' : 'normal' }}
                      >
                        $ {tier.rate.toFixed(2)}/k
                      </span>
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
                  <span className="text-white font-semibold text-xs sm:text-sm">${userInfo.walletBalance.toFixed(2)}</span>
                </div>
                <PixelButton href="/dashboard/deposit" variant="gold" size="sm">
                  Add Funds
                </PixelButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && userInfo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-md p-4 sm:p-6" style={{ background: '#1a1a1e', border: '3px solid #e1ad2d', boxShadow: '4px 4px 0px #000' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-accent uppercase">Confirm Gems Purchase</h3>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Gems</span>
                <span className="text-white font-medium text-sm">{amount.toLocaleString()}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Price</span>
                <span className="text-white font-medium text-sm">${discountedPrice.toFixed(2)}</span>
              </div>
              {userInfo.canUseDiscordDiscount && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase">Discord First Purchase</span>
                  <span className="text-green-400 text-sm">-2.5%</span>
                </div>
              )}
              {userInfo.loyaltyDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase">Loyalty Discount</span>
                  <span className="text-green-400 text-sm">-{parseFloat((userInfo.loyaltyDiscount * 100).toFixed(1))}%</span>
                </div>
              )}
              <div className="border-t-[2px] border-dark-600 pt-3 flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Current Balance</span>
                <span className="text-white text-sm">${userInfo.walletBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">After Purchase</span>
                <span className={`font-medium text-sm ${
                  userInfo.walletBalance >= discountedPrice ? 'text-white' : 'text-red-400'
                }`}>
                  ${(userInfo.walletBalance - discountedPrice).toFixed(2)}
                </span>
              </div>
            </div>

            {userInfo.walletBalance < discountedPrice ? (
              <div className="space-y-3">
                <p className="text-red-400 text-xs text-center uppercase">Insufficient balance</p>
                <PixelButton href="/dashboard/deposit" variant="gold" size="md" fullWidth>
                  Add Funds
                </PixelButton>
              </div>
            ) : (
              <div className="flex gap-3">
                <PixelButton variant="blue" size="md" onClick={() => setShowConfirm(false)} className="flex-1">
                  Cancel
                </PixelButton>
                <PixelButton variant="gold" size="md" onClick={handleConfirmPurchase} disabled={purchasing} className="flex-1">
                  {purchasing ? 'Buying...' : 'Confirm Purchase'}
                </PixelButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
