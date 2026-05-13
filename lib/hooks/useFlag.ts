'use client'

import { useState, useEffect } from 'react'

/**
 * Client-side hook that checks a PostHog feature flag.
 * Returns `defaultValue` until PostHog loads (or if blocked by ad-blockers).
 */
export function useFlag(flagKey: string, defaultValue: boolean = false): boolean {
  const [enabled, setEnabled] = useState(defaultValue)

  useEffect(() => {
    try {
      // Dynamic import so the module is only loaded client-side
      import('posthog-js').then(({ default: posthog }) => {
        try {
          const value = posthog.isFeatureEnabled(flagKey)
          if (typeof value === 'boolean') {
            setEnabled(value)
          }
          // Also listen for flag updates
          posthog.onFeatureFlags(() => {
            try {
              const v = posthog.isFeatureEnabled(flagKey)
              if (typeof v === 'boolean') setEnabled(v)
            } catch { /* posthog blocked */ }
          })
        } catch { /* posthog blocked */ }
      }).catch(() => { /* posthog blocked */ })
    } catch { /* posthog blocked */ }
  }, [flagKey])

  return enabled
}

/**
 * Server-side helper that evaluates a PostHog feature flag via the decide API.
 */
export async function getFlag(
  flagKey: string,
  distinctId: string,
  defaultValue: boolean = false,
): Promise<boolean> {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || ''
  const personalKey = process.env.POSTHOG_PERSONAL_API_KEY || ''

  if (!apiKey) return defaultValue

  try {
    const res = await fetch(`${host}/decide/?v=3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(personalKey ? { Authorization: `Bearer ${personalKey}` } : {}),
      },
      body: JSON.stringify({
        api_key: apiKey,
        distinct_id: distinctId,
      }),
    })

    if (!res.ok) return defaultValue

    const data = await res.json()
    const flags = data.featureFlags ?? {}
    return flags[flagKey] !== undefined ? Boolean(flags[flagKey]) : defaultValue
  } catch {
    return defaultValue
  }
}
