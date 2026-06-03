'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { Minus, Plus, X, Wallet, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { PixelButton } from '@/components/ui'
import { useCurrency, useAuth } from '@/components/providers'

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

// Safe wrapper around posthog.capture. Some content blockers (uBlock,
// Firefox strict tracking protection) can leave posthog-js in a partially
// initialized state after blocking posthog-recorder.js, and a subsequent
// capture() call can throw synchronously into the React tree — which is
// what was bubbling up to the global-error boundary and showing users a
// bare "Something went wrong" on /gems. Telemetry is best-effort and must
// never crash the page.
function safeCapture(event: string, props?: Record<string, unknown>): void {
  try {
    // Direct call into posthog-js. Wrapped in try/catch so a partial-init
    // SDK state (see banner comment above) can't throw into the React tree.
    posthog.capture(event, props)
  } catch (e) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('[posthog] capture failed', event, e)
    }
  }
}

interface UserInfo {
  user: { id: string; name: string } | null
  walletBalance: number
  loyaltyDiscount: number
  canUseDiscordDiscount: boolean
  discordLinked: boolean
  notifyOnBotRecovery: boolean
}

export default function GemsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-900" />}>
      <GemsContent />
    </Suspense>
  )
}

// Mounted at module-scope so all click handlers can compute time-since-load
// without re-creating the value on every render.
const PAGE_LOAD_MS = typeof window !== 'undefined' ? Date.now() : 0

function detectDeviceType(): 'Desktop' | 'Mobile' | 'Tablet' {
  if (typeof window === 'undefined') return 'Desktop'
  try {
    if (window.matchMedia('(max-width: 640px)').matches) return 'Mobile'
    if (window.matchMedia('(max-width: 1024px)').matches) return 'Tablet'
  } catch { /* fall through */ }
  return 'Desktop'
}

function GemsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { formatPrice, formatPricePerK, isUsd, currency } = useCurrency()
  const [amount, setAmount] = useState(5)
  const [inputValue, setInputValue] = useState('5')
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [listings, setListings] = useState<GemListing[]>([])
  const [selectedListing, setSelectedListing] = useState<GemListing | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [botOnline, setBotOnline] = useState(true)
  const [offlineSinceMs, setOfflineSinceMs] = useState<number | null>(null)
  const [prefilled, setPrefilled] = useState(false)
  const fromBot = searchParams?.get('fromBot') === '1'
  const fromRecovery = searchParams?.get('from') === 'recovery'
  const fromOutageNotify = searchParams?.get('from') === 'outage_notify'
  const resumeBuyId = searchParams?.get('resumeBuy') ?? null
  // Track previous bot status across renders to fire `bot_status_changed` only
  // on actual transitions (not on initial mount).
  const prevBotOnlineRef = useRef<boolean | null>(null)
  const [amountChangedSinceMount, setAmountChangedSinceMount] = useState(false)
  const resumeBuyHandledRef = useRef(false)
  const outageNotifyHandledRef = useRef(false)
  // Pre-auth banner (Scope 2): show sticky top banner to logged-out visitors
  // who land on /gems. Dismiss persisted in localStorage but resurfaces on
  // each new sessionStorage session.
  const [preauthBannerVisible, setPreauthBannerVisible] = useState(false)
  const preauthImpressionFiredRef = useRef(false)
  // Mobile sticky CTA (Scope 1): track impression once per (listing, amount)
  // change so we don't spam events as the user adjusts the amount.
  const stickyCtaImpressionKeyRef = useRef<string | null>(null)

  // Stepper debounce: batch rapid +/- clicks into a single state update.
  const stepperTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepperPendingRef = useRef<{ netDelta: number; clicks: number; directions: Set<'up' | 'down'> } | null>(null)
  const amountRef = useRef(amount)
  amountRef.current = amount

  useEffect(() => {
    fetchUser()
    fetchListings()
    fetchBotStatus()
    // Re-poll every 30s so transitions (offline→online or vice versa) flip the
    // banner without needing a full page refresh.
    const id = setInterval(fetchBotStatus, 30_000)
    return () => clearInterval(id)
  }, [])

  // Fire `bot_status_changed` only on actual transitions.
  useEffect(() => {
    if (prevBotOnlineRef.current === null) {
      prevBotOnlineRef.current = botOnline
      return
    }
    if (prevBotOnlineRef.current !== botOnline) {
      safeCapture('bot_status_changed', {
        online: botOnline,
        prev_online: prevBotOnlineRef.current,
        offline_since_ms: offlineSinceMs,
      })
      prevBotOnlineRef.current = botOnline
    }
  }, [botOnline, offlineSinceMs])

  async function fetchBotStatus() {
    try {
      const res = await fetch('/api/bot/status')
      if (res.ok) {
        const data = await res.json()
        setBotOnline(data.online)
        setOfflineSinceMs(data.offlineSinceMs ?? null)
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
            discordLinked: !!data.discordLinked,
            notifyOnBotRecovery: !!data.notifyOnBotRecovery,
          })
          return
        }
      }
    } catch { /* Not logged in — fall through to set logged-out sentinel */ }
    // Logged-out path: set a resolved-but-no-user sentinel so consumers that
    // gate on `userInfo === null` (e.g. the pre-auth banner) can proceed.
    setUserInfo({
      user: null,
      walletBalance: 0,
      loyaltyDiscount: 0,
      canUseDiscordDiscount: false,
      discordLinked: false,
      notifyOnBotRecovery: false,
    })
  }

  // Track when the offline banner is shown so we can fire `outage_banner_shown`
  // exactly once per outage view (not on every render).
  const bannerImpressionFiredRef = useRef(false)
  useEffect(() => {
    if (botOnline) {
      bannerImpressionFiredRef.current = false
      return
    }
    if (!bannerImpressionFiredRef.current) {
      bannerImpressionFiredRef.current = true
      safeCapture('outage_banner_shown', {
        offline_since_ms: offlineSinceMs,
        logged_in: !!userInfo?.user,
        discord_linked: !!userInfo?.discordLinked,
        already_subscribed: !!userInfo?.notifyOnBotRecovery,
      })
    }
  }, [botOnline, offlineSinceMs, userInfo?.user, userInfo?.discordLinked, userInfo?.notifyOnBotRecovery])

  // "DM me when bot's back" inline action for users who already have Discord
  // linked. Sets `notifyOnBotRecovery=true` on the user; the Discord bot's
  // recovery batch picks it up and DMs them.
  const [notifySubmitting, setNotifySubmitting] = useState(false)
  async function handleNotifyMe() {
    if (notifySubmitting || !userInfo) return
    safeCapture('outage_notify_clicked', { discord_linked: userInfo.discordLinked })
    if (!userInfo.discordLinked) {
      // Send through Discord OAuth — link AND set the flag in one trip.
      safeCapture('outage_discord_link_clicked')
      window.location.href = '/api/auth/discord?reason=outage_notify'
      return
    }
    setNotifySubmitting(true)
    try {
      const res = await fetch('/api/users/me/notify-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOnBotRecovery: true }),
      })
      if (res.ok) {
        setUserInfo(prev => prev ? { ...prev, notifyOnBotRecovery: true } : prev)
        setToast({ type: 'success', text: "You're subscribed — we'll DM you the moment the bot's back." })
        safeCapture('outage_notify_subscribed', { via: 'inline' })
      } else {
        setToast({ type: 'error', text: 'Could not subscribe. Try linking Discord again.' })
      }
    } catch {
      setToast({ type: 'error', text: 'Network error. Try again.' })
    } finally {
      setNotifySubmitting(false)
    }
  }

  async function fetchListings() {
    try {
      const res = await fetch('/api/gems/listings')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings)
        // Auto-select cheapest with enough stock for default amount.
        // Bulk tiers make the real cheapest listing depend on the selected amount,
        // so don't rely on the API's base-price ordering here.
        if (data.listings.length > 0) {
          setSelectedListing(findBestListingForAmount(data.listings, amount))
        }
      }
    } catch { /* fallback */ }
  }

  // After Roblox auth, if the user came back via ?from=outage_notify, finish
  // the chain: linked Discord → set notify-prefs flag inline; otherwise → kick
  // them through Discord OAuth with reason=outage_notify (which links AND
  // sets the flag). One-shot via ref so re-renders don't re-trigger.
  useEffect(() => {
    if (!fromOutageNotify || !userInfo?.user || outageNotifyHandledRef.current) return
    outageNotifyHandledRef.current = true
    if (userInfo.discordLinked) {
      handleNotifyMe()
    } else {
      window.location.href = '/api/auth/discord?reason=outage_notify'
    }
  }, [fromOutageNotify, userInfo?.user, userInfo?.discordLinked])

  // Resume buy intent: ?resumeBuy=<id> populated after Roblox auth from a
  // logged-out Buy click. Hydrate the selected listing + amount and auto-open
  // the confirm modal so the user can complete in one click.
  useEffect(() => {
    if (!resumeBuyId || resumeBuyHandledRef.current || listings.length === 0) return
    if (!userInfo?.user) return // need to be authed first; effect re-runs when user loads
    resumeBuyHandledRef.current = true
    ;(async () => {
      try {
        const res = await fetch(`/api/buy-intent/${encodeURIComponent(resumeBuyId)}`)
        if (!res.ok) {
          if (res.status === 410) {
            setToast({ type: 'error', text: 'Your buy session expired. Please re-select.' })
          }
          return
        }
        const data = await res.json()
        const targetListing = listings.find(l => l.id === data.listingId)
        if (!targetListing) return
        const safeAmount = Math.min(Math.max(1, data.amountK), targetListing.stockK || data.amountK)
        setSelectedListing(targetListing)
        setAmount(safeAmount)
        setInputValue(String(safeAmount))
        // Open confirm modal once amount + listing are settled
        setAgreedToTerms(false)
        setShowConfirm(true)
        // intent_age_seconds: derived from expiresAt + the API's 10-minute TTL.
        // The API doesn't expose createdAt directly, so we compute age as
        // (TTL - timeUntilExpiry).
        const INTENT_TTL_SECONDS = 10 * 60
        let intentAgeSeconds: number | null = null
        try {
          const expiresAtMs = new Date(data.expiresAt).getTime()
          const secondsUntilExpiry = Math.max(0, (expiresAtMs - Date.now()) / 1000)
          intentAgeSeconds = Math.max(0, Math.round(INTENT_TTL_SECONDS - secondsUntilExpiry))
        } catch {
          // expiresAt malformed — leave null
        }
        safeCapture('gems_resume_buy_hydrated', {
          intent_id: resumeBuyId,
          amount_k: safeAmount,
          intent_age_seconds: intentAgeSeconds,
          from_oauth_callback: true, // ?resumeBuy is only ever set by the post-OAuth redirect
          restored_amount: safeAmount,
          restored_listing_id: targetListing.id,
        })
      } catch { /* ignore */ }
    })()
  }, [resumeBuyId, listings, userInfo?.user])

  // Quicklink prefill from Discord bot: ?amount=&listing=&fromBot=1
  useEffect(() => {
    if (prefilled || listings.length === 0) return
    const amountParam = searchParams?.get('amount')
    const listingParam = searchParams?.get('listing')

    let nextAmount = amount
    if (amountParam) {
      const parsed = parseInt(amountParam)
      const ceiling = Math.max(...listings.map(l => Math.min(l.stockK, l.maxOrderK)), 1)
      if (!isNaN(parsed) && parsed >= 1 && parsed <= ceiling) {
        nextAmount = parsed
        setAmount(parsed)
        setInputValue(String(parsed))
      }
    }

    if (listingParam) {
      const exact = listingParam === 'platform'
        ? listings.find(l => l.type === 'platform' && canListingFulfill(l, nextAmount))
        : listings.find(l => l.type === 'vendor' && l.vendorId === listingParam && canListingFulfill(l, nextAmount))
      if (exact) {
        setSelectedListing(exact)
      } else {
        const fallback = findBestListingForAmount(listings, nextAmount)
        if (fallback) setSelectedListing(fallback)
      }
    } else if (amountParam) {
      const fallback = findBestListingForAmount(listings, nextAmount)
      if (fallback) setSelectedListing(fallback)
    }

    setPrefilled(true)
  }, [listings])

  // Pre-auth banner visibility: show to logged-out users unless they
  // dismissed in this browser session. localStorage stores dismiss across
  // sessions BUT we use sessionStorage as a per-session "shown already" flag
  // so the banner reappears next session even if dismissed last time.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (userInfo === null) return // wait for fetchUser to settle
    if (userInfo.user) { setPreauthBannerVisible(false); return }
    let dismissedThisSession = false
    try {
      dismissedThisSession = sessionStorage.getItem('sd_preauth_banner_dismissed_session') === '1'
    } catch { /* ignore */ }
    if (dismissedThisSession) return
    setPreauthBannerVisible(true)
  }, [userInfo])

  // Fire impression event once per session when banner becomes visible.
  useEffect(() => {
    if (!preauthBannerVisible || preauthImpressionFiredRef.current) return
    preauthImpressionFiredRef.current = true
    safeCapture('gems_preauth_banner_visible', {
      amount_k: amount,
      listing_id: selectedListing?.id ?? null,
    })
  }, [preauthBannerVisible, amount, selectedListing?.id])

  // Shared "login with current selection persisted as buy intent" — used by
  // both the main Buy button (logged-out path) and the pre-auth banner CTA.
  async function loginWithBuyIntent(source: 'buy_button' | 'preauth_banner') {
    let resumeUrl = '/gems'
    if (selectedListing) {
      try {
        const res = await fetch('/api/buy-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: selectedListing.id, amountK: amount }),
        })
        if (res.ok) {
          const data = await res.json()
          resumeUrl = `/gems?resumeBuy=${encodeURIComponent(data.id)}`
        }
      } catch { /* fall back to bare /gems */ }
    }
    document.cookie = `return_to=${encodeURIComponent(resumeUrl)};path=/;max-age=600;SameSite=Lax`
    safeCapture('login_initiated', { source, page: 'gems' })
    window.location.href = '/api/auth/roblox'
  }

  function getEffectiveRate(listing: GemListing, amountK: number): number {
    if (listing.bulkTiers && listing.bulkTiers.length > 0) {
      const sorted = [...listing.bulkTiers].sort((a, b) => b.minK - a.minK)
      const tier = sorted.find(t => amountK >= t.minK)
      if (tier) return tier.pricePerK
    }
    return listing.pricePerK
  }

  function canListingFulfill(listing: GemListing, amountK: number): boolean {
    return (
      listing.stockK >= amountK &&
      amountK >= listing.minOrderK &&
      amountK <= listing.maxOrderK
    )
  }

  function sortListingsForAmount(source: GemListing[], amountK: number): GemListing[] {
    return [...source].sort((a, b) => {
      const aCanFulfill = canListingFulfill(a, amountK)
      const bCanFulfill = canListingFulfill(b, amountK)
      if (aCanFulfill !== bCanFulfill) return aCanFulfill ? -1 : 1

      const rateDelta = getEffectiveRate(a, amountK) - getEffectiveRate(b, amountK)
      if (rateDelta !== 0) return rateDelta

      const baseDelta = a.pricePerK - b.pricePerK
      if (baseDelta !== 0) return baseDelta

      return b.stockK - a.stockK
    })
  }

  function findBestListingForAmount(source: GemListing[], amountK: number): GemListing | null {
    const sorted = sortListingsForAmount(source, amountK)
    return sorted.find(l => canListingFulfill(l, amountK))
      || sorted.find(l => l.stockK > 0)
      || sorted[0]
      || null
  }

  const maxAmount = listings.length > 0
    ? Math.max(...listings.map(l => Math.min(l.stockK, l.maxOrderK)))
    : 10000

  const sortedListings = sortListingsForAmount(listings, amount)

  const handleAmountChange = (newAmount: number, source?: 'preset' | 'input' | 'slider' | '+' | '-') => {
    if (newAmount >= 1 && newAmount <= maxAmount) {
      if (source) {
        const rate = selectedListing ? getEffectiveRate(selectedListing, newAmount) : 2.90
        const usd = Math.round(newAmount * rate * 100) / 100
        safeCapture('gems_amount_changed', {
          amount_k: newAmount,
          source,
          amount: usd,
          gems_qty: newAmount * 1000,
          price_usd_per_gem: rate / 1000,
          currency,
          listing_id: selectedListing?.id ?? null,
        })
        setAmountChangedSinceMount(true)
      }
      setAmount(newAmount)
      setInputValue(String(newAmount))
      // Auto-switch listing if current one can't fulfill the new amount
      if (selectedListing && !canListingFulfill(selectedListing, newAmount)) {
        const best = findBestListingForAmount(listings, newAmount)
        if (best) setSelectedListing(best)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    setInputValue(digits)
    const parsed = parseInt(digits)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= maxAmount) {
      handleAmountChange(parsed)
    }
  }

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue)
    if (!inputValue || isNaN(parsed) || parsed < 1) {
      setInputValue(String(amount))
    } else if (parsed > maxAmount) {
      handleAmountChange(maxAmount, 'input')
    } else if (parsed !== amount) {
      const rate = selectedListing ? getEffectiveRate(selectedListing, parsed) : 2.90
      const usd = Math.round(parsed * rate * 100) / 100
      safeCapture('gems_amount_changed', {
        amount_k: parsed,
        source: 'input',
        amount: usd,
        gems_qty: parsed * 1000,
        price_usd_per_gem: rate / 1000,
        currency,
        listing_id: selectedListing?.id ?? null,
      })
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
  const selectedCanFulfill = selectedListing ? canListingFulfill(selectedListing, amount) : false
  const cheapestRate = listings.length > 0
    ? Math.min(...listings.filter(l => l.stockK > 0).map(l => l.pricePerK))
    : 2.90

  // Generic per-element click instrumentation. Listens at the page wrapper
  // level, walks up to the closest data-ph-id, and fires `gems_element_clicked`
  // (always) plus `gems_disabled_button_clicked` (when target is disabled).
  // This is the rage-click investigation hook.
  function handleInstrumentedClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as Element | null
    if (!target) return
    const tagged = target.closest('[data-ph-id]') as HTMLElement | null
    if (!tagged) return

    const elementId = tagged.getAttribute('data-ph-id') || 'unknown'
    const ariaDisabled = tagged.getAttribute('aria-disabled') === 'true'
    const nativeDisabled =
      (tagged as HTMLButtonElement).disabled === true ||
      tagged.hasAttribute('disabled')
    const classDisabled =
      tagged.classList.contains('disabled') ||
      tagged.classList.contains('opacity-50') // visually-disabled style used on /gems
    const isDisabled = ariaDisabled || nativeDisabled || classDisabled

    // If the clicked element carries its own listing id (e.g. listing card),
    // surface it on the event so we can disambiguate which card was clicked
    // even though all listing cards share the same element_id.
    const clickedListingId =
      tagged.getAttribute('data-ph-listing-id') ||
      selectedListing?.id ||
      null
    const clickedListingType = tagged.getAttribute('data-ph-listing-type') || null

    const payload = {
      element_id: elementId,
      auth_state: userInfo?.user ? 'logged_in' : 'logged_out',
      is_disabled: isDisabled,
      current_amount: discountedPrice,
      current_gems_qty: amount,
      current_listing_id: clickedListingId,
      current_listing_type: clickedListingType,
      device_type: detectDeviceType(),
      viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
      time_since_page_load_ms: PAGE_LOAD_MS ? Date.now() - PAGE_LOAD_MS : null,
    }

    safeCapture('gems_element_clicked', payload)
    if (isDisabled) {
      safeCapture('gems_disabled_button_clicked', payload)
    }
  }

  function handlePurchaseClick() {
    const authState = userInfo?.user ? 'logged_in' : 'logged_out'
    const balanceUsd = userInfo?.walletBalance ?? null
    const hasSufficient = userInfo ? userInfo.walletBalance >= discountedPrice : null
    safeCapture('gems_buy_clicked', {
      amount_k: amount,
      total_price: discountedPrice,
      amount: discountedPrice,
      gems_qty: amount * 1000,
      listing_id: selectedListing?.id ?? null,
      auth_state: authState,
      current_balance_usd: balanceUsd,
      has_sufficient_balance: hasSufficient,
    })
    if (!botOnline) {
      safeCapture('gems_buy_blocked', {
        reason: 'bot_offline',
        amount_k: amount,
        amount: discountedPrice,
        listing_id: selectedListing?.id ?? null,
        auth_state: authState,
        current_balance_usd: balanceUsd,
        required_balance_usd: discountedPrice,
        gap_usd: balanceUsd != null ? Math.max(0, Math.round((discountedPrice - balanceUsd) * 100) / 100) : null,
        currency,
        gems_qty: amount * 1000,
      })
      setToast({ type: 'error', text: 'The trade bot is currently offline. Join our Discord for updates!' })
      return
    }
    if (!selectedListing || !selectedCanFulfill) {
      safeCapture('gems_buy_blocked', {
        reason: 'listing_unavailable',
        amount_k: amount,
        amount: discountedPrice,
        listing_id: selectedListing?.id ?? null,
        auth_state: authState,
        current_balance_usd: balanceUsd,
        required_balance_usd: discountedPrice,
        gap_usd: balanceUsd != null ? Math.max(0, Math.round((discountedPrice - balanceUsd) * 100) / 100) : null,
        currency,
        gems_qty: amount * 1000,
      })
      setToast({ type: 'error', text: 'That price tier cannot fulfill this amount. Pick another tier or lower the amount.' })
      return
    }
    if (userInfo && userInfo.walletBalance < discountedPrice) {
      safeCapture('gems_buy_blocked', {
        reason: 'insufficient_balance',
        amount_k: amount,
        balance: userInfo.walletBalance,
        required: discountedPrice,
        amount: discountedPrice,
        listing_id: selectedListing?.id ?? null,
        auth_state: authState,
        current_balance_usd: userInfo.walletBalance,
        required_balance_usd: discountedPrice,
        gap_usd: Math.round((discountedPrice - userInfo.walletBalance) * 100) / 100,
        currency,
        gems_qty: amount * 1000,
      })
      safeCapture('gems_insufficient_balance_shown', {
        deficit_amount: Math.round((discountedPrice - userInfo.walletBalance) * 100) / 100,
        current_balance: userInfo.walletBalance,
        attempted_amount: discountedPrice,
        currency,
      })
    }
    setAgreedToTerms(false)
    setShowConfirm(true)
    safeCapture('gems_confirm_modal_opened', {
      amount_k: amount,
      total_price: discountedPrice,
      amount: discountedPrice,
      gems_qty: amount * 1000,
      listing_id: selectedListing?.id ?? null,
      vendor_id: selectedListing?.vendorId ?? null,
    })
  }

  async function handleConfirmPurchase() {
    if (!userInfo || !selectedListing) return

    safeCapture('gems_confirm_modal_closed', {
      amount_k: amount,
      total_price: discountedPrice,
      reason: 'confirmed',
      amount: discountedPrice,
      gems_qty: amount * 1000,
      listing_id: selectedListing.id,
      closed_via: 'confirmed',
    })
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
        safeCapture('gems_purchase_failed', { amount_k: amount, error: data.error })
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

      // is_repeat_purchase: client-side check via localStorage timestamp of last
      // gem purchase. Considered a repeat if a purchase happened within 30 days.
      // Set null if localStorage is unavailable (rather than blocking the event).
      let isRepeatPurchase: boolean | null = null
      try {
        const lastPurchaseTs = localStorage.getItem('last_gems_purchase_ts')
        if (lastPurchaseTs) {
          const ageMs = Date.now() - parseInt(lastPurchaseTs)
          isRepeatPurchase = ageMs <= 30 * 24 * 60 * 60 * 1000
        } else {
          isRepeatPurchase = false
        }
        localStorage.setItem('last_gems_purchase_ts', String(Date.now()))
      } catch {
        // localStorage unavailable — leave null so event still fires
      }

      safeCapture('gems_purchased', {
        amount_k: amount,
        gems_k: amount,
        total_price: discountedPrice,
        amount_usd: discountedPrice,
        base_price_usd: totalPrice,
        rate_per_k: currentRate,
        listing_id: selectedListing.id,
        listing_type: selectedListing.type,
        vendor_id: selectedListing.vendorId,
        discount_pct: combinedDiscount,
        has_loyalty_discount: (userInfo.loyaltyDiscount || 0) > 0,
        has_discord_discount: !!userInfo.canUseDiscordDiscount,
        from: fromRecovery ? 'recovery' : (fromBot ? 'discord_bot' : 'web'),
        // Required property additions
        amount: discountedPrice,
        gems_qty: amount * 1000,
        price_usd: discountedPrice,
        currency,
        intent_id: resumeBuyId,
        is_repeat_purchase: isRepeatPurchase,
      })
      router.push(`/dashboard/orders/${data.order.id}`)
    } catch {
      safeCapture('gems_purchase_failed', { amount_k: amount, error: 'network_error' })
      setToast({ type: 'error', text: 'Something went wrong' })
      setShowConfirm(false)
    } finally {
      setPurchasing(false)
    }
  }

  // Sticky CTA visibility: only after a listing is selected, on mobile, for
  // EITHER auth state (clicking it kicks off login-with-intent if needed).
  const stickyCtaShouldShow = !!selectedListing && totalStockK > 0
  const stickyCtaKey = stickyCtaShouldShow ? `${selectedListing!.id}:${amount}` : null
  useEffect(() => {
    if (!stickyCtaShouldShow || !stickyCtaKey) return
    if (stickyCtaImpressionKeyRef.current === stickyCtaKey) return
    stickyCtaImpressionKeyRef.current = stickyCtaKey
    safeCapture('mobile_sticky_buy_cta_visible', {
      listing_id: selectedListing!.id,
      amount_k: amount,
      total_price: discountedPrice,
    })
  }, [stickyCtaKey, stickyCtaShouldShow])

  async function handleStickyCtaClick() {
    safeCapture('mobile_sticky_buy_cta_clicked', {
      listing_id: selectedListing?.id ?? null,
      amount_k: amount,
      total_price: discountedPrice,
      auth_state: userInfo?.user ? 'logged_in' : 'logged_out',
    })
    if (!userInfo?.user) {
      await loginWithBuyIntent('buy_button')
      return
    }
    handlePurchaseClick()
  }

  return (
    <div className="min-h-screen bg-dark-900" onClick={handleInstrumentedClick}>
      {/* Pre-auth banner (B-fix): logged-out visitors landing on /gems get a
          sticky top banner pointing them to login. Banner sits ABOVE the
          listings; dismiss persists in sessionStorage so it doesn't nag this
          session, but resurfaces on next session. */}
      {preauthBannerVisible && (
        <div
          className="sticky top-[56px] sm:top-[64px] md:top-[72px] z-30 px-3 sm:px-6 py-3"
          style={{
            background: 'rgba(225,173,45,0.12)',
            borderBottom: '2px solid rgba(225,173,45,0.5)',
            backdropFilter: 'blur(6px)',
          }}
          role="region"
          aria-label="Sign-in prompt"
        >
          <div className="max-w-[1000px] mx-auto flex items-center gap-3">
            <p className="flex-1 text-yellow-300 text-[11px] sm:text-sm uppercase font-bold leading-tight">
              Login with Roblox to buy gems
            </p>
            <button
              onClick={async () => {
                safeCapture('gems_preauth_banner_clicked', {
                  amount_k: amount,
                  listing_id: selectedListing?.id ?? null,
                })
                await loginWithBuyIntent('preauth_banner')
              }}
              className="relative inline-flex items-center justify-center pixel-btn-press shrink-0"
              style={{ minHeight: 44, minWidth: 100 }}
            >
              <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[44px] w-auto min-w-[100px]" style={{ imageRendering: 'pixelated' }} />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider px-3">
                Login
              </span>
            </button>
            <button
              onClick={() => {
                safeCapture('gems_preauth_banner_dismissed', {
                  amount_k: amount,
                  listing_id: selectedListing?.id ?? null,
                })
                try { sessionStorage.setItem('sd_preauth_banner_dismissed_session', '1') } catch { /* ignore */ }
                try { localStorage.setItem('sd_preauth_banner_dismissed_at', String(Date.now())) } catch { /* ignore */ }
                setPreauthBannerVisible(false)
              }}
              className="text-yellow-300/70 hover:text-yellow-300 shrink-0"
              aria-label="Dismiss banner"
              style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 pb-44 md:pb-16">
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
              <button
                data-ph-id="gems-toast-close"
                onClick={() => setToast(null)}
                className="text-current opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!botOnline && (
          <div
            className="mb-6 p-4 sm:p-5"
            style={{ background: 'rgba(245,158,11,0.08)', border: '2px solid rgba(245,158,11,0.35)' }}
          >
            <p className="text-yellow-400 text-xs sm:text-sm uppercase font-bold mb-2 text-center">
              Trade bot is temporarily offline
            </p>
            <p className="text-gray-300 text-[11px] sm:text-xs leading-relaxed text-center mb-4">
              Skip the queue when it&apos;s back &mdash; first to spend wallet credit gets first delivery.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3 mb-2">
              <Link
                data-ph-id="gems-outage-topup-wallet"
                href="/dashboard/deposit?source=outage_offer"
                onClick={() => safeCapture('outage_deposit_clicked', { logged_in: !!userInfo?.user })}
                className="relative inline-flex items-center justify-center pixel-btn-press"
                style={{ textDecoration: 'none' }}
              >
                <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[44px] sm:h-[48px] w-full sm:w-auto sm:min-w-[180px]" />
                <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider">
                  Top up wallet
                </span>
              </Link>

              {userInfo?.notifyOnBotRecovery ? (
                <div
                  className="inline-flex items-center justify-center px-4 py-3 text-[10px] sm:text-xs uppercase font-bold text-green-400"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)' }}
                >
                  &#10003; You&apos;ll be DM&apos;d on recovery
                </div>
              ) : !userInfo?.user ? (
                <button
                  data-ph-id="gems-outage-signin-for-dm"
                  onClick={() => {
                    safeCapture('outage_login_to_notify_clicked')
                    document.cookie = `return_to=${encodeURIComponent('/gems?from=outage_notify')};path=/;max-age=600;SameSite=Lax`
                    window.location.href = '/api/auth/roblox'
                  }}
                  className="relative inline-flex items-center justify-center pixel-btn-press"
                >
                  <img src="/images/pixel/pngs/asset-60.png" alt="" className="h-[44px] sm:h-[48px] w-full sm:w-auto sm:min-w-[180px]" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
                    Sign in to get DM
                  </span>
                </button>
              ) : (
                <button
                  data-ph-id="gems-outage-notify-me"
                  onClick={handleNotifyMe}
                  disabled={notifySubmitting}
                  className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50"
                >
                  <img src="/images/pixel/pngs/asset-60.png" alt="" className="h-[44px] sm:h-[48px] w-full sm:w-auto sm:min-w-[180px]" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
                    {notifySubmitting ? 'Subscribing...' : 'DM me when back'}
                  </span>
                </button>
              )}
            </div>
            <p className="text-gray-500 text-[9px] sm:text-[10px] text-center mt-2">
              Wallet deposits are non-refundable but always credit to your platform wallet &mdash; spend on anything, anytime.
            </p>
          </div>
        )}

        {fromBot && (
          <div className="mb-6 p-4 text-center" style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)' }}>
            <p className="text-yellow-400 text-xs uppercase font-bold mb-1">Continuing your Discord order</p>
            <p className="text-gray-400 text-[10px]">
              Your gems and seller are pre-filled. Confirm below — you&apos;ll be pinged in Discord for delivery.
            </p>
          </div>
        )}

        {!isUsd && (
          <p className="text-[10px] text-gray-500 mb-4 text-center uppercase">Prices shown in {currency} are approximate.</p>
        )}

        {/* Page Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-accent mb-3 sm:mb-4 uppercase">
            Buy Sniper Duels Gems
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
                {PRESET_AMOUNTS.map((preset) => {
                  const canFulfill = listings.some(l => canListingFulfill(l, preset))
                  const exceedsMax = preset > maxAmount
                  const exceedsBalance = !!(userInfo?.user && userInfo.walletBalance !== undefined && selectedListing && (() => {
                    const rate = getEffectiveRate(selectedListing, preset)
                    const price = Math.round(preset * rate * 100) / 100
                    const disc = isVendorSelected ? 0 : (userInfo.loyaltyDiscount || 0) + (userInfo.canUseDiscordDiscount ? 0.025 : 0)
                    const final_ = disc > 0 ? Math.round(price * (1 - disc) * 100) / 100 : price
                    return final_ > userInfo.walletBalance
                  })())
                  const isUnfulfillable = exceedsMax || !canFulfill
                  const isDisabled = isUnfulfillable || exceedsBalance
                  const disabledReason = isUnfulfillable
                    ? (exceedsMax ? `Not enough stock for ${preset}k` : `No listing can fulfill ${preset}k`)
                    : exceedsBalance ? 'Exceeds your wallet balance' : undefined

                  return (
                    <button
                      key={preset}
                      data-ph-id={`gems-amount-preset-${preset}`}
                      onClick={() => { if (!isDisabled) handleAmountChange(preset, 'preset') }}
                      className={`relative inline-flex items-center justify-center pixel-btn-press ${amount !== preset ? 'opacity-50' : ''}`}
                      style={isDisabled ? { pointerEvents: 'none' } : undefined}
                      aria-disabled={isDisabled || undefined}
                      aria-label={disabledReason}
                      title={disabledReason}
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
                  )
                })}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mb-6 sm:mb-8">
              <label className="block text-[10px] sm:text-xs text-white mb-2 sm:mb-3 uppercase font-bold">Custom Amount (in thousands)</label>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  data-ph-id="gems-amount-stepper-down"
                  onClick={() => {
                    if (!stepperPendingRef.current) {
                      stepperPendingRef.current = { netDelta: 0, clicks: 0, directions: new Set() }
                    }
                    stepperPendingRef.current.netDelta -= 1
                    stepperPendingRef.current.clicks += 1
                    stepperPendingRef.current.directions.add('down')
                    if (stepperTimeoutRef.current) clearTimeout(stepperTimeoutRef.current)
                    stepperTimeoutRef.current = setTimeout(() => {
                      const pending = stepperPendingRef.current
                      if (!pending) return
                      const finalAmount = Math.max(1, Math.min(maxAmount, amountRef.current + pending.netDelta))
                      const dirs = pending.directions
                      const direction = dirs.has('up') && dirs.has('down') ? 'mixed' : dirs.has('up') ? 'up' : 'down'
                      handleAmountChange(finalAmount, '-')
                      safeCapture('gems_stepper_debounced', {
                        final_amount_k: finalAmount,
                        clicks_batched: pending.clicks,
                        direction,
                        listing_id: selectedListing?.id ?? null,
                        currency,
                      })
                      stepperPendingRef.current = null
                      stepperTimeoutRef.current = null
                    }, 200)
                  }}
                  disabled={amount <= 1}
                  className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src="/images/pixel/pngs/asset-63.png" alt="" className="h-[36px] sm:h-[40px] w-auto" />
                  <Minus className="absolute w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
                <div className="flex-1 relative">
                  <input
                    data-ph-id="gems-amount-input"
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-center text-lg sm:text-xl font-bold text-white focus:outline-none"
                    style={{ background: '#1a1a1e', border: '3px solid #2a2a2e' }}
                  />
                  <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base uppercase">k</span>
                </div>
                <button
                  data-ph-id="gems-amount-stepper-up"
                  onClick={() => {
                    if (!stepperPendingRef.current) {
                      stepperPendingRef.current = { netDelta: 0, clicks: 0, directions: new Set() }
                    }
                    stepperPendingRef.current.netDelta += 1
                    stepperPendingRef.current.clicks += 1
                    stepperPendingRef.current.directions.add('up')
                    if (stepperTimeoutRef.current) clearTimeout(stepperTimeoutRef.current)
                    stepperTimeoutRef.current = setTimeout(() => {
                      const pending = stepperPendingRef.current
                      if (!pending) return
                      const finalAmount = Math.max(1, Math.min(maxAmount, amountRef.current + pending.netDelta))
                      const dirs = pending.directions
                      const direction = dirs.has('up') && dirs.has('down') ? 'mixed' : dirs.has('up') ? 'up' : 'down'
                      handleAmountChange(finalAmount, '+')
                      safeCapture('gems_stepper_debounced', {
                        final_amount_k: finalAmount,
                        clicks_batched: pending.clicks,
                        direction,
                        listing_id: selectedListing?.id ?? null,
                        currency,
                      })
                      stepperPendingRef.current = null
                      stepperTimeoutRef.current = null
                    }, 200)
                  }}
                  disabled={amount >= maxAmount}
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
                {!isUsd && (
                  <p className="text-[10px] text-gray-500 mt-1 text-right">≈ ${discountedPrice.toFixed(2)} USD · price shown in {currency}</p>
                )}
              </div>
            </div>

            {/* Soft login prompt (B3) — only shows for logged-out users who
                have engaged with the amount picker (signal of buying intent).
                Front-loads the auth round-trip so they don't hit the wall on
                Buy click. */}
            {!userInfo?.user && amountChangedSinceMount && selectedListing && (
              <div
                className="mb-4 p-3 text-center"
                style={{ background: 'rgba(225,173,45,0.08)', border: '2px solid rgba(225,173,45,0.3)' }}
              >
                <p className="text-yellow-400 text-[10px] sm:text-xs uppercase font-bold mb-1">
                  Sign in to lock in {amount}k @ {formatPricePerK(currentRate)}
                </p>
                <p className="text-gray-400 text-[10px] leading-relaxed">
                  Roblox login takes ~5 seconds &mdash; you&apos;ll come back here ready to buy.
                </p>
              </div>
            )}

            {/* Purchase Button */}
            <div className="flex justify-center">
              {!userInfo?.user ? (
                <button
                  data-ph-id="gems-login-cta"
                  onClick={async () => {
                    safeCapture('gems_buy_blocked', {
                      reason: 'not_logged_in',
                      amount_k: amount,
                      amount: discountedPrice,
                      listing_id: selectedListing?.id ?? null,
                      auth_state: 'logged_out',
                      current_balance_usd: null, // not logged in — no wallet
                      required_balance_usd: discountedPrice,
                      gap_usd: null, // unknown without a balance
                      currency,
                      gems_qty: amount * 1000,
                    })
                    if (!selectedListing) {
                      // Defensive: shouldn't happen since button is gated on stock
                      document.cookie = `return_to=${encodeURIComponent('/gems')};path=/;max-age=600;SameSite=Lax`
                      window.location.href = '/api/auth/roblox'
                      return
                    }
                    await loginWithBuyIntent('buy_button')
                  }}
                  className="relative inline-flex items-center justify-center pixel-btn-press"
                  style={{ minHeight: 52, minWidth: 180 }}
                >
                  <img
                    src="/images/pixel/pngs/asset-88.png"
                    alt=""
                    className="h-[52px] sm:h-[58px] w-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider">
                    Login to Buy
                  </span>
                </button>
              ) : (
                <button
                  data-ph-id="gems-buy-button"
                  onClick={handlePurchaseClick}
                  disabled={!selectedCanFulfill}
                  aria-disabled={!selectedCanFulfill}
                  className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: 52, minWidth: 180 }}
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
                        : !selectedCanFulfill
                          ? 'Tier Unavailable'
                        : 'Finish Purchase'
                    }
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Right column - Pricing Selector */}
          <div>
            {/* Vendor/Platform Price Selector */}
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-accent mb-2 uppercase text-center">Select Price</h3>
              <p className="text-gray-400 text-[10px] sm:text-xs uppercase text-center mb-4 sm:mb-6">Choose a price tier &mdash; cheapest first</p>
              <div className="space-y-2 sm:space-y-3">
                {sortedListings.map((listing) => {
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
                    <div
                      key={listing.id}
                      data-ph-id="gems-listing-card"
                      data-ph-listing-id={listing.id}
                      data-ph-listing-type={listing.type}
                      className={!hasStock || !inRange ? 'opacity-40' : ''}
                    >
                      <button
                        data-ph-id="gems-listing-card-cta"
                        data-ph-listing-id={listing.id}
                        data-ph-listing-type={listing.type}
                        onClick={() => {
                          if (hasStock && inRange) {
                            const priceUsd = Math.round(amount * rate * 100) / 100
                            // discount_pct: bulk-tier discount vs base rate (only set if listing has bulk
                            // tiers AND the active rate is below the base). vendor_name not knowable —
                            // /api/gems/listings only exposes vendorId.
                            const discountPct = hasBulk && rate < listing.pricePerK
                              ? Math.round((1 - rate / listing.pricePerK) * 1000) / 1000
                              : null
                            safeCapture('gems_listing_selected', {
                              type: listing.type,
                              rate,
                              listing_id: listing.id,
                              gems_qty: amount * 1000,
                              price_usd: priceUsd,
                              currency,
                              vendor_id: listing.vendorId,
                              vendor_name: null, // not exposed by /api/gems/listings
                              discount_pct: discountPct,
                            })
                            setSelectedListing(listing)
                          }
                        }}
                        disabled={!hasStock || !inRange}
                        aria-disabled={!hasStock || !inRange}
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
                  data-ph-id="gems-wallet-add-funds"
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

      {/* Mobile sticky bottom Buy CTA (Scope 1) — only on mobile, only once a
          listing is selected. Tapping it follows the same path as the
          desktop button (login-with-intent if logged-out, else open confirm
          modal). Hidden when the confirm modal is open to avoid double UI. */}
      {stickyCtaShouldShow && !showConfirm && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 py-3"
          style={{
            background: 'rgba(10,10,11,0.96)',
            borderTop: '2px solid #e1ad2d',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.4)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          }}
          role="region"
          aria-label="Quick buy"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 leading-tight">
                {amount.toLocaleString()}k gems
              </p>
              <p className="text-base font-bold text-white leading-tight truncate">
                {formatPrice(discountedPrice)}
              </p>
            </div>
            <button
              onClick={handleStickyCtaClick}
              disabled={!selectedCanFulfill && !!userInfo?.user}
              className="relative inline-flex items-center justify-center pixel-btn-press disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              style={{ minHeight: 48, minWidth: 140 }}
            >
              <img
                src="/images/pixel/pngs/asset-88.png"
                alt=""
                className="h-[48px] w-auto min-w-[140px]"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[11px] uppercase tracking-wider px-3">
                {!userInfo?.user
                  ? 'Login to Buy'
                  : selectedStockK < amount
                    ? `${selectedStockK.toLocaleString()}k max`
                    : !selectedCanFulfill
                      ? 'Unavailable'
                    : 'Buy'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && userInfo && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-md p-4 sm:p-6" style={{ background: '#1a1a1e', border: '3px solid #e1ad2d', boxShadow: '4px 4px 0px #000' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-accent uppercase">Confirm Gems Purchase</h3>
              <button
                data-ph-id="gems-confirm-modal-close"
                onClick={() => { safeCapture('gems_confirm_modal_closed', { amount_k: amount, total_price: discountedPrice, reason: 'dismissed', amount: discountedPrice, gems_qty: amount * 1000, listing_id: selectedListing?.id ?? null, closed_via: 'x_button' }); setShowConfirm(false) }}
                className="text-gray-400 hover:text-white"
              >

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
                data-ph-id="gems-confirm-modal-terms-checkbox"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => { setAgreedToTerms(e.target.checked); if (e.target.checked) safeCapture('terms_agreed', { page: 'gems' }) }}
                className="mt-0.5 w-4 h-4 accent-accent shrink-0"
              />
              <span className="text-[10px] text-gray-400 leading-tight">
                I agree that{' '}
                <Link data-ph-id="gems-terms-link" href="/terms" className="text-accent hover:underline" target="_blank">all sales are final</Link>
                {' '}and non-refundable once delivered. Filing a dispute or chargeback will result in a permanent ban. Issues?{' '}
                <a data-ph-id="gems-help-link" href="https://discord.gg/sniperduels" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">Open a ticket in our Discord</a>.
              </span>
            </label>

            {userInfo.walletBalance < discountedPrice ? (
              <div className="space-y-3">
                <p className="text-red-400 text-xs text-center uppercase">You need {formatPrice(Math.round((discountedPrice - userInfo.walletBalance) * 100) / 100)} more</p>
                <button
                  data-ph-id="gems-confirm-modal-add-funds"
                  onClick={async () => {
                    const needed = Math.ceil((discountedPrice - userInfo.walletBalance) * 100) / 100
                    safeCapture('gems_buy_blocked', {
                      reason: 'insufficient_balance_modal_add_funds',
                      amount_k: amount,
                      balance: userInfo.walletBalance,
                      required: discountedPrice,
                      amount: discountedPrice,
                      listing_id: selectedListing?.id ?? null,
                      auth_state: 'logged_in',
                      current_balance_usd: userInfo.walletBalance,
                      required_balance_usd: discountedPrice,
                      gap_usd: Math.round((discountedPrice - userInfo.walletBalance) * 100) / 100,
                      currency,
                      gems_qty: amount * 1000,
                    })
                    // Create / reuse a buy intent so we can resume the gem purchase after deposit lands.
                    let intentId: string | null = resumeBuyId
                    if (!intentId && selectedListing) {
                      try {
                        const res = await fetch('/api/buy-intent', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ listingId: selectedListing.id, amountK: amount }),
                        })
                        if (res.ok) {
                          const data = await res.json()
                          intentId = data.id
                        }
                      } catch { /* fall back without intent */ }
                    }
                    const url = intentId
                      ? `/dashboard/deposit?amount=${needed}&intentId=${encodeURIComponent(intentId)}`
                      : `/dashboard/deposit?amount=${needed}`
                    window.location.href = url
                  }}
                  className="relative inline-flex items-center justify-center pixel-btn-press w-full"
                >
                  <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[48px] sm:h-[52px] w-auto" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider">
                    Add Funds
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  data-ph-id="gems-confirm-modal-cancel"
                  onClick={() => { safeCapture('gems_confirm_modal_closed', { amount_k: amount, total_price: discountedPrice, reason: 'cancelled', amount: discountedPrice, gems_qty: amount * 1000, listing_id: selectedListing?.id ?? null, closed_via: 'cancel_button' }); setShowConfirm(false) }}
                  className="flex-1 relative h-[42px] bg-no-repeat bg-center bg-contain border-0 cursor-pointer active:scale-95 transition-transform"
                  style={{ backgroundImage: 'url(/images/pixel/pngs/asset-60.png)', backgroundSize: '100% 100%' }}
                >
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider">
                    Cancel
                  </span>
                </button>
                <button
                  data-ph-id="gems-confirm-modal-confirm"
                  onClick={handleConfirmPurchase}
                  disabled={purchasing || !agreedToTerms}
                  aria-disabled={purchasing || !agreedToTerms}
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
