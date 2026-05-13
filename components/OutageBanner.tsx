'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import Link from 'next/link'

function safeCapture(event: string, props?: Record<string, unknown>): void {
  try {
    posthog.capture(event, props)
  } catch (e) {
    if (typeof window !== 'undefined') {
      console.warn('[posthog] capture failed', event, e)
    }
  }
}

interface UserInfo {
  user: { id: string; name: string } | null
  discordLinked: boolean
  notifyOnBotRecovery: boolean
}

interface OutageBannerProps {
  surface: string
}

export default function OutageBanner({ surface }: OutageBannerProps) {
  const pathname = usePathname()
  const [botOnline, setBotOnline] = useState(true)
  const [offlineSinceMs, setOfflineSinceMs] = useState<number | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [notifySubmitting, setNotifySubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const bannerImpressionFiredRef = useRef(false)

  useEffect(() => {
    fetchBotStatus()
    fetchUser()
    const id = setInterval(fetchBotStatus, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUserInfo({
            user: data.user,
            discordLinked: !!data.discordLinked,
            notifyOnBotRecovery: !!data.notifyOnBotRecovery,
          })
          return
        }
      }
    } catch { /* not logged in */ }
    setUserInfo({ user: null, discordLinked: false, notifyOnBotRecovery: false })
  }

  // Fire impression once per outage view
  useEffect(() => {
    if (botOnline) {
      bannerImpressionFiredRef.current = false
      return
    }
    if (!bannerImpressionFiredRef.current) {
      bannerImpressionFiredRef.current = true
      safeCapture('outage_banner_shown', {
        $pathname: pathname,
        surface,
        offline_since_ms: offlineSinceMs,
        logged_in: !!userInfo?.user,
        discord_linked: !!userInfo?.discordLinked,
        already_subscribed: !!userInfo?.notifyOnBotRecovery,
      })
    }
  }, [botOnline, offlineSinceMs, userInfo, pathname, surface])

  async function handleNotifyMe() {
    if (notifySubmitting || !userInfo) return
    safeCapture('outage_notify_clicked', { discord_linked: userInfo.discordLinked, surface })
    if (!userInfo.discordLinked) {
      safeCapture('outage_discord_link_clicked', { surface })
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
        setToast("You're subscribed — we'll DM you the moment the bot's back.")
      } else {
        setToast('Could not subscribe. Try linking Discord again.')
      }
    } catch {
      setToast('Network error. Try again.')
    } finally {
      setNotifySubmitting(false)
    }
  }

  if (botOnline) return null

  return (
    <>
      {toast && (
        <div
          className="fixed top-20 right-4 z-50 p-3 sm:p-4 max-w-[calc(100vw-2rem)] sm:max-w-sm"
          style={{
            background: 'rgba(34,197,94,0.15)',
            border: '2px solid #22c55e',
            color: '#4ade80',
            boxShadow: '4px 4px 0px #000',
          }}
        >
          <p className="text-xs uppercase">{toast}</p>
        </div>
      )}
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
            href="/dashboard/deposit?source=outage_offer"
            onClick={() => safeCapture('outage_deposit_clicked', { logged_in: !!userInfo?.user, surface })}
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
              onClick={() => {
                safeCapture('outage_login_to_notify_clicked', { surface })
                document.cookie = `return_to=${encodeURIComponent(pathname || '/')};path=/;max-age=600;SameSite=Lax`
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
        <div className="flex justify-center mt-3">
          <a
            href="https://discord.gg/sniperduels"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => safeCapture('outage_discord_clicked', { surface })}
            className="text-gray-400 hover:text-white text-[10px] sm:text-xs uppercase"
          >
            Join Discord for updates →
          </a>
        </div>
      </div>
    </>
  )
}
