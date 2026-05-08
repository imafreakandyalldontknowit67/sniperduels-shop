'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import posthog from 'posthog-js'

const UTM_KEYS = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term'] as const
const UTM_SESSION_FLAG = 'sd_utm_captured_v1'
const UTM_SESSION_VALUES = 'sd_utm_values_v1'

export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const utmCheckedRef = useRef(false)

  // Capture & persist UTM params for the entire session as PostHog super
  // properties. First-touch wins: if we've already captured UTMs this
  // session, we don't overwrite them.
  useEffect(() => {
    if (utmCheckedRef.current) return
    if (typeof window === 'undefined') return
    utmCheckedRef.current = true

    let captured: Record<string, string> | null = null

    // 1) Replay stored UTMs onto every event for this session
    try {
      const stored = sessionStorage.getItem(UTM_SESSION_VALUES)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>
        if (parsed && typeof parsed === 'object') {
          posthog.register(parsed)
        }
      }
    } catch { /* sessionStorage unavailable */ }

    // 2) On the FIRST URL of the session, if it has UTMs, capture them once
    const alreadyCaptured = (() => {
      try { return sessionStorage.getItem(UTM_SESSION_FLAG) === '1' } catch { return false }
    })()

    if (!alreadyCaptured) {
      const collected: Record<string, string | null> = {}
      let hasAny = false
      for (const k of UTM_KEYS) {
        const v = searchParams?.get(k) ?? null
        collected[k] = v
        if (v) hasAny = true
      }

      if (hasAny) {
        // Strip nulls for register() — only persist what we actually saw
        captured = {}
        for (const k of UTM_KEYS) {
          if (collected[k]) captured[k] = collected[k] as string
        }
        // Persist as super properties so EVERY subsequent event includes them
        posthog.register(captured)
        try {
          sessionStorage.setItem(UTM_SESSION_VALUES, JSON.stringify(captured))
          sessionStorage.setItem(UTM_SESSION_FLAG, '1')
        } catch { /* ignore */ }
        posthog.capture('utm_captured', {
          utm_source: collected.utm_source,
          utm_campaign: collected.utm_campaign,
          utm_medium: collected.utm_medium,
          utm_content: collected.utm_content,
          utm_term: collected.utm_term,
          landing_path: pathname || null,
        })
      } else {
        // Mark session-checked even with no UTMs so we don't keep re-evaluating
        try { sessionStorage.setItem(UTM_SESSION_FLAG, '1') } catch { /* ignore */ }
      }
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      const params = searchParams?.toString()
      if (params) {
        url += '?' + params
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}
