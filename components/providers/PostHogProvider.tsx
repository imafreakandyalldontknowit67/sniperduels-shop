'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

// Sample rate for session recording (0.0 - 1.0). Set via env to dial up/down.
// Defaults to 1.0 on /gems (full recording) so we can debug rage-clicks.
const SESSION_RECORDING_SAMPLE_RATE = (() => {
  const raw = process.env.NEXT_PUBLIC_POSTHOG_RECORDING_SAMPLE_RATE
  const n = raw ? parseFloat(raw) : NaN
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 1.0
})()

// Walk up from the click target to find the closest data-ph-id attribute.
function findPhId(target: EventTarget | null): string | null {
  if (!target || !(target instanceof Element)) return null
  const el = target.closest('[data-ph-id]') as HTMLElement | null
  return el?.getAttribute('data-ph-id') || null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      // Enable session recording site-wide; sample rate is gated per-page below.
      // For /gems we always record (rage-click hot zone). For other pages we
      // honor the env-driven sample rate.
      session_recording: {
        maskAllInputs: true,
        collectFonts: true,
      },
      // Enrich autocaptured $rageclick (and other autocapture events) with the
      // closest data-ph-id ancestor of the click target so we can attribute
      // the rage to a specific instrumented element without parsing CSS
      // selectors after the fact.
      before_send: (event) => {
        if (!event) return event
        if (event.event === '$rageclick' || event.event === '$autocapture') {
          // posthog-js stashes the original DOM event on properties.$event under
          // some versions; for $rageclick we instead rely on listener-level
          // enrichment (see global click listener below) writing to a window
          // ref. Fall back to whatever element_id we may have already set.
          const lastPhId = (typeof window !== 'undefined')
            ? (window as unknown as { __ph_last_click_ph_id?: string | null }).__ph_last_click_ph_id
            : null
          if (lastPhId && event.properties) {
            event.properties.target_element_id = lastPhId
          }
        }
        return event
      },
      loaded: (ph) => {
        // Decide whether to record this session based on path + sample rate.
        // /gems always records; other pages obey SESSION_RECORDING_SAMPLE_RATE.
        try {
          const onGems = typeof window !== 'undefined' && window.location.pathname.startsWith('/gems')
          const shouldRecord = onGems || Math.random() < SESSION_RECORDING_SAMPLE_RATE
          if (shouldRecord) {
            ph.startSessionRecording()
          } else {
            ph.stopSessionRecording()
          }
        } catch { /* non-fatal */ }
      },
    })

    // Global capture-phase click listener that stamps the closest data-ph-id
    // onto a window-scoped ref BEFORE posthog-js runs its own autocapture
    // handler. This is what before_send reads when enriching $rageclick.
    const onClickCapture = (e: MouseEvent) => {
      try {
        const phId = findPhId(e.target)
        ;(window as unknown as { __ph_last_click_ph_id?: string | null }).__ph_last_click_ph_id = phId
      } catch { /* non-fatal */ }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('click', onClickCapture, true)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', onClickCapture, true)
      }
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
