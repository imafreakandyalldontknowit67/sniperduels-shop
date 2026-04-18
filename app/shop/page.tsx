'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import Image from 'next/image'
import { Card, Button } from '@/components/ui'
import { Loader2, X } from 'lucide-react'
import Link from 'next/link'
import type { StockItem } from '@/lib/storage'
import { useCurrency, useAuth } from '@/components/providers'

const rarityColors: Record<string, string> = {
  Collectible: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  Secret: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Uncommon: 'bg-green-500/20 text-green-400 border-green-500/30',
  Knife: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const filters = ['All', 'Snipers', 'Knives', 'Crates'] as const
type Filter = typeof filters[number]

interface UserInfo {
  user: { id: string; name: string } | null
  walletBalance: number
  loyaltyDiscount: number
  canUseDiscordDiscount: boolean
}

export default function ShopPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { formatPrice, isUsd, currency } = useCurrency()
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<Filter>('All')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [confirmItem, setConfirmItem] = useState<StockItem | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)
  const [comingSoonLoading, setComingSoonLoading] = useState(true)
  const [botOnline, setBotOnline] = useState(true)

  useEffect(() => {
    fetchComingSoon()
    fetchItems()
    fetchUser()
    fetch('/api/bot/status').then(r => r.json()).then(d => setBotOnline(d.online)).catch(() => {})
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  async function fetchComingSoon() {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setComingSoon(data.itemsComingSoon)
      }
    } catch {
      setComingSoon(false)
    } finally {
      setComingSoonLoading(false)
    }
  }

  async function fetchItems() {
    try {
      const res = await fetch('/api/stock')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

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

  function handleBuyClick(item: StockItem) {
    posthog.capture('item_buy_clicked', {
      item_id: item.id,
      item_name: item.name,
      item_type: item.type,
      item_rarity: item.rarity,
      price: item.priceUsd,
    })
    if (!botOnline) {
      posthog.capture('item_buy_blocked', { reason: 'bot_offline', item_id: item.id })
      setToast({ type: 'error', text: 'The trade bot is currently offline. Join our Discord for updates!' })
      return
    }
    if (userInfo && userInfo.walletBalance < getDiscountedPrice(item.priceUsd)) {
      posthog.capture('item_buy_blocked', { reason: 'insufficient_balance', item_id: item.id, balance: userInfo.walletBalance, required: getDiscountedPrice(item.priceUsd) })
    }
    setAgreedToTerms(false)
    setConfirmItem(item)
  }

  async function handleConfirmPurchase() {
    if (!confirmItem || !userInfo) return

    setPurchasing(true)
    try {
      const res = await fetch('/api/orders/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: confirmItem.id, quantity: 1 }),
      })

      const data = await res.json()

      if (!res.ok) {
        posthog.capture('item_purchase_failed', { item_id: confirmItem.id, error: data.error })
        if (data.error === 'Insufficient wallet balance') {
          setToast({ type: 'error', text: `Not enough balance (${formatPrice(data.balance)}). Add funds first!` })
        } else {
          setToast({ type: 'error', text: data.error || 'Purchase failed' })
        }
        setConfirmItem(null)
        return
      }

      posthog.capture('item_purchased', {
        item_id: confirmItem.id,
        item_name: confirmItem.name,
        price: confirmItem.priceUsd,
        discounted_price: getDiscountedPrice(confirmItem.priceUsd),
      })
      router.push(`/dashboard/orders/${data.order.id}`)
    } catch {
      posthog.capture('item_purchase_failed', { item_id: confirmItem.id, error: 'network_error' })
      setToast({ type: 'error', text: 'Something went wrong' })
      setConfirmItem(null)
    } finally {
      setPurchasing(false)
    }
  }

  const filteredItems = selectedFilter === 'All'
    ? items
    : items.filter(item => {
        if (selectedFilter === 'Snipers') return item.type === 'sniper'
        if (selectedFilter === 'Knives') return item.type === 'knife'
        if (selectedFilter === 'Crates') return item.type === 'crate'
        return true
      })

  const getDiscountedPrice = (price: number) => {
    const combinedDiscount = (userInfo?.loyaltyDiscount || 0) + (userInfo?.canUseDiscordDiscount ? 0.025 : 0)
    if (!combinedDiscount) return Math.round(price * 100) / 100
    return Math.round(price * (1 - combinedDiscount) * 100) / 100
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-20 right-4 z-50 p-4 border-[2px] pixel-shadow max-w-sm ${
            toast.type === 'success'
              ? 'bg-dark-700 border-green-500 text-green-400'
              : 'bg-dark-700 border-red-500 text-red-400'
          }`}>
            <div className="flex items-start gap-3">
              <p className="text-xs uppercase flex-1">{toast.text}</p>
              <button onClick={() => setToast(null)} className="text-current opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 uppercase">
            Browse <span className="text-accent">Items</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-xs uppercase">
            Choose from our selection of snipers, knives, and crates. All items delivered automatically.
          </p>
        </div>

        {/* Coming Soon Blocker */}
        {(comingSoonLoading || comingSoon) ? (
          comingSoonLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-dark-700 border-[2px] border-accent mb-6">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="12" y="4" width="16" height="4" fill="#e1ad2d"/>
                  <rect x="8" y="8" width="4" height="24" fill="#e1ad2d"/>
                  <rect x="28" y="8" width="4" height="24" fill="#e1ad2d"/>
                  <rect x="12" y="32" width="16" height="4" fill="#e1ad2d"/>
                  <rect x="18" y="16" width="4" height="12" fill="#e1ad2d"/>
                  <rect x="22" y="16" width="4" height="4" fill="#e1ad2d"/>
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 uppercase">Coming Soon</h2>
              <p className="text-gray-400 max-w-md mx-auto mb-8 text-xs uppercase">
                The items shop is currently being prepared. In the meantime, check out our gems store!
              </p>
              <Link
                href="/gems"
                className="relative inline-flex items-center justify-center pixel-btn-press"
                style={{ textDecoration: 'none' }}
              >
                <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[56px] sm:h-[62px] w-auto" />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-xs sm:text-sm uppercase tracking-wider">
                  Browse Gems
                </span>
              </Link>
            </div>
          )
        ) : (
        <>
        {/* Wallet Balance Bar */}
        {userInfo?.user && (
          <div className="flex items-center justify-between p-4 bg-dark-700 border-[2px] border-dark-500 mb-8">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" fill="none" stroke="#e1ad2d" strokeWidth="2"/>
                <rect x="12" y="8" width="4" height="4" fill="#e1ad2d"/>
              </svg>
              <span className="text-gray-400 text-xs uppercase">Wallet Balance:</span>
              <span className="text-white font-semibold text-sm">{formatPrice(userInfo.walletBalance)}</span>
            </div>
            <Button href="/dashboard/deposit" size="sm">Add Funds</Button>
          </div>
        )}
        {!isUsd && (
          <p className="text-[10px] text-gray-500 mb-4 text-center uppercase">Prices shown in {currency} are approximate.</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto mb-4">
              <rect x="16" y="8" width="32" height="8" fill="#3a3a42"/>
              <rect x="12" y="16" width="40" height="32" fill="none" stroke="#3a3a42" strokeWidth="4"/>
              <rect x="28" y="28" width="8" height="8" fill="#3a3a42"/>
            </svg>
            <h3 className="text-lg font-semibold text-white mb-2 uppercase">No items available</h3>
            <p className="text-gray-400 text-xs uppercase">Check back soon for new stock!</p>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-dark-700 border-[2px] border-dark-500">
              <span className="text-gray-400 text-xs uppercase">Filter by:</span>
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => { posthog.capture('shop_filter_changed', { filter }); setSelectedFilter(filter) }}
                  className={`px-4 py-2 text-xs uppercase border-[2px] ${
                    selectedFilter === filter
                      ? 'bg-pixel-blue-dark text-white border-pixel-blue pixel-shadow-sm'
                      : 'bg-dark-600 text-gray-400 hover:text-white hover:bg-dark-500 border-dark-400'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto mb-4">
                  <rect x="16" y="8" width="32" height="8" fill="#3a3a42"/>
                  <rect x="12" y="16" width="40" height="32" fill="none" stroke="#3a3a42" strokeWidth="4"/>
                  <rect x="28" y="28" width="8" height="8" fill="#3a3a42"/>
                </svg>
                <h3 className="text-lg font-semibold text-white mb-2 uppercase">No {selectedFilter.toLowerCase()} available</h3>
                <p className="text-gray-400 text-xs uppercase">Try selecting a different category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item, index) => {
                  const rarityStyle = item.rarity ? rarityColors[item.rarity] || 'bg-gray-500/20 text-gray-400' : null
                  const discountedPrice = getDiscountedPrice(item.priceUsd)
                  const hasDiscount = discountedPrice < item.priceUsd

                  return (
                    <div
                      key={item.id}
                      className="animate-pixel-fade-up"
                      style={{ animationDelay: `${Math.min(index * 80, 400)}ms`, animationFillMode: 'both' }}
                    >
                    <Card hover className="group">
                      {/* Item Image */}
                      <div className="aspect-video bg-dark-600 relative overflow-hidden">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={150}
                            height={150}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                              <rect x="28" y="4" width="8" height="8" fill="#e1ad2d" opacity="0.3"/>
                              <rect x="20" y="12" width="8" height="8" fill="#e1ad2d" opacity="0.3"/>
                              <rect x="16" y="20" width="8" height="36" fill="#e1ad2d" opacity="0.3"/>
                              <rect x="24" y="24" width="8" height="8" fill="#e1ad2d" opacity="0.3"/>
                            </svg>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-dark-800/80 text-xs text-gray-400 uppercase border-[1px] border-dark-500">
                            {item.type}
                          </span>
                          {rarityStyle && (
                            <span className={`px-2 py-1 text-xs border-[1px] uppercase ${rarityStyle}`}>
                              {item.rarity}
                            </span>
                          )}
                        </div>

                        {/* Stock Warning */}
                        {item.stock <= 5 && item.stock > 0 && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs uppercase border-[1px] border-red-500/30">
                              Only {item.stock} left!
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="p-5">
                        <h3 className="text-white font-semibold text-sm mb-1 uppercase">
                          {item.name}
                        </h3>

                        {/* Extras */}
                        {(item.fx || item.fragtrak) && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {item.fx && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs uppercase border-[1px] border-purple-500/30">
                                FX: {item.fx}
                              </span>
                            )}
                            {item.fragtrak && (
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs uppercase border-[1px] border-cyan-500/30">
                                Fragtrak: {item.fragtrak}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div>
                            {hasDiscount ? (
                              <>
                                <span className="text-gray-500 line-through text-xs mr-2">
                                  {formatPrice(item.priceUsd)}
                                </span>
                                <span className="text-xl font-bold text-accent">
                                  {formatPrice(discountedPrice)}
                                </span>
                              </>
                            ) : (
                              <span className="text-xl font-bold text-white">
                                {formatPrice(item.priceUsd)}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="blue"
                            disabled={item.stock === 0}
                            onClick={() => {
                              if (!userInfo?.user) {
                                posthog.capture('item_buy_blocked', { reason: 'not_logged_in', item_id: item.id })
                                login()
                              } else if (item.stock > 0) {
                                handleBuyClick(item)
                              }
                            }}
                          >
                            {item.stock === 0 ? 'Out of Stock' : !userInfo?.user ? 'Login to Buy' : 'Buy Now'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </>
      )}
      </div>

      {/* Confirmation Modal */}
      {confirmItem && userInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-dark-800 border-[3px] border-accent p-6 max-w-md w-full mx-4 pixel-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-accent uppercase">Confirm Purchase</h3>
              <button onClick={() => setConfirmItem(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Item</span>
                <span className="text-white font-medium text-xs uppercase">{confirmItem.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Price</span>
                <span className="text-white font-medium text-xs">{formatPrice(getDiscountedPrice(confirmItem.priceUsd))}</span>
              </div>
              {userInfo.canUseDiscordDiscount && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase">Discord First Purchase</span>
                  <span className="text-green-400 text-xs">-2.5%</span>
                </div>
              )}
              {userInfo.loyaltyDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs uppercase">Loyalty Discount</span>
                  <span className="text-green-400 text-xs">-{parseFloat((userInfo.loyaltyDiscount * 100).toFixed(1))}%</span>
                </div>
              )}
              <div className="border-t-[2px] border-dark-600 pt-3 flex justify-between">
                <span className="text-gray-400 text-xs uppercase">Current Balance</span>
                <span className="text-white text-xs">{formatPrice(userInfo.walletBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs uppercase">After Purchase</span>
                <span className={`font-medium text-xs ${
                  userInfo.walletBalance >= getDiscountedPrice(confirmItem.priceUsd)
                    ? 'text-white'
                    : 'text-red-400'
                }`}>
                  {formatPrice(userInfo.walletBalance - getDiscountedPrice(confirmItem.priceUsd))}
                </span>
              </div>
            </div>

            <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => { setAgreedToTerms(e.target.checked); if (e.target.checked) posthog.capture('terms_agreed', { page: 'shop' }) }}
                className="mt-0.5 w-4 h-4 accent-accent shrink-0"
              />
              <span className="text-[10px] text-gray-400 leading-tight">
                I agree that{' '}
                <a href="/terms" className="text-accent hover:underline" target="_blank">all sales are final</a>
                {' '}and non-refundable once delivered. Filing a dispute or chargeback will result in a permanent ban. Issues?{' '}
                <a href="https://discord.gg/sniperduels" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">Open a ticket in our Discord</a>.
              </span>
            </label>

            {userInfo.walletBalance < getDiscountedPrice(confirmItem.priceUsd) ? (
              <div className="space-y-3">
                <p className="text-red-400 text-xs text-center uppercase">Insufficient balance</p>
                <Button href={`/dashboard/deposit?amount=${Math.ceil((getDiscountedPrice(confirmItem.priceUsd) - userInfo.walletBalance) * 100) / 100}`} className="w-full">Add Funds</Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmItem(null)}
                  className="flex-1 py-3 bg-dark-600 hover:bg-dark-500 text-white text-xs font-medium uppercase border-[2px] border-dark-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={purchasing || !agreedToTerms}
                  className="flex-1 py-3 bg-accent hover:bg-accent-light disabled:bg-accent/50 text-black text-xs font-bold uppercase border-[3px] border-accent-dark pixel-shadow"
                >
                  {purchasing ? 'Buying...' : 'Confirm Purchase'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
