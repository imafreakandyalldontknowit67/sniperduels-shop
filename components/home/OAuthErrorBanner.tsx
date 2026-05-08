'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { X } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  oauth_denied: 'You declined the Roblox login. Click below to try again.',
  session_failed: 'Your session expired. Log in again to continue.',
  invalid_state: 'Login link expired or invalid. Please try again.',
  token_exchange_failed: "We couldn't complete the login with Roblox. Please try again.",
}

function OAuthErrorBannerInner() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const errorParam = searchParams?.get('error') ?? null
  const errorCode = errorParam && ERROR_MESSAGES[errorParam] ? errorParam : null
  const [visible, setVisible] = useState<string | null>(null)
  const firedImpressionRef = useRef<string | null>(null)

  useEffect(() => {
    if (!errorCode) return
    setVisible(errorCode)
    if (firedImpressionRef.current !== errorCode) {
      firedImpressionRef.current = errorCode
      posthog.capture('oauth_error_displayed', { error_code: errorCode })
    }
    // Auto-clear the param from the URL so a refresh doesn't re-show the
    // banner. Do this after we've captured + rendered so the user sees the
    // message; we keep it in component state via `visible`.
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      const newUrl = url.pathname + (url.search ? url.search : '') + url.hash
      window.history.replaceState({}, '', newUrl)
    } catch { /* ignore */ }
  }, [errorCode, pathname])

  if (!visible) return null
  const message = ERROR_MESSAGES[visible]

  return (
    <div
      className="fixed top-[64px] sm:top-[72px] left-0 right-0 z-40 mx-3 sm:mx-auto sm:max-w-2xl mt-3 p-4 sm:p-5"
      style={{
        background: 'rgba(239,68,68,0.1)',
        border: '2px solid rgba(239,68,68,0.5)',
        boxShadow: '4px 4px 0px #000',
      }}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-red-300 text-[10px] sm:text-xs uppercase font-bold tracking-wider mb-2">
            Sign-in problem
          </p>
          <p className="text-gray-200 text-xs sm:text-sm leading-relaxed mb-3">
            {message}
          </p>
          <button
            onClick={() => {
              posthog.capture('oauth_retry_clicked', { error_code: visible })
              document.cookie = `return_to=${encodeURIComponent('/')};path=/;max-age=600;SameSite=Lax`
              window.location.href = '/api/auth/roblox'
            }}
            className="relative inline-flex items-center justify-center pixel-btn-press"
            style={{ minHeight: 44 }}
          >
            <img src="/images/pixel/pngs/asset-59.png" alt="" className="h-[44px] w-auto min-w-[160px]" style={{ imageRendering: 'pixelated' }} />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider px-4">
              Try again
            </span>
          </button>
        </div>
        <button
          onClick={() => setVisible(null)}
          className="text-gray-400 hover:text-white shrink-0"
          aria-label="Dismiss"
          style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export function OAuthErrorBanner() {
  return (
    <Suspense fallback={null}>
      <OAuthErrorBannerInner />
    </Suspense>
  )
}
