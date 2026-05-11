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
      // Don't auto-queue the recorder script during init. Some content blockers
      // (uBlock Origin, Firefox strict tracking protection) block
      // posthog-recorder.js outright, and posthog-js v1.360.x can leave the
      // SDK in a half-initialized state when the lazy recorder load fails —
      // a state from which downstream `posthog.capture()` calls can throw.
      // We start recording manually below, deferred + guarded, so a recorder
      // load failure can never poison the synchronous init path.
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        collectFonts: true,
      },
      // Enrich autocaptured $rageclick (and other autocapture events) with the
      // closest data-ph-id ancestor of the click target so we can attribute
      // the rage to a specific instrumented element without parsing CSS
      // selectors after the fact.
      before_send: (event) => {
        try {
          if (!event) return event
          if (event.event === '$rageclick' || event.event === '$autocapture') {
            const lastPhId = (typeof window !== 'undefined')
              ? (window as unknown as { __ph_last_click_ph_id?: string | null }).__ph_last_click_ph_id
              : null
            if (lastPhId && event.properties) {
              // Clone-mutate-replace rather than direct property assignment:
              // posthog-js v1.360.x can freeze event.properties when its
              // session-recording integration partially fails (e.g. recorder
              // script blocked by uBlock). A direct write to a frozen object
              // throws synchronously inside before_send and propagates to the
              // React click handler that triggered the capture.
              event.properties = { ...event.properties, target_element_id: lastPhId }
            }
          }
        } catch { /* non-fatal — never let telemetry sink the click */ }
        return event
      },
      loaded: (ph) => {
        // Decide whether to record this session based on path + sample rate.
        // /gems always records; other pages obey SESSION_RECORDING_SAMPLE_RATE.
        //
        // Deferred to setTimeout(0) so any recorder-script onerror (uBlock,
        // CSP, network) can fire harmlessly before we touch posthog state.
        // Double try/catch so a recorder load failure can NEVER bubble out
        // of the provider.
        try {
          const onGems = typeof window !== 'undefined' && window.location.pathname.startsWith('/gems')
          const shouldRecord = onGems || Math.random() < SESSION_RECORDING_SAMPLE_RATE
          if (!shouldRecord) return
          setTimeout(() => {
            try { ph.startSessionRecording() } catch { /* recorder blocked — fine */ }
          }, 0)
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
