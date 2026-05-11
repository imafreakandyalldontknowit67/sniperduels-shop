'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'

// Route-level error boundary for /gems. Catches anything thrown in the
// gems subtree (initial render, effects, event handlers that bubble up
// to React) so users see a friendly fallback with actionable links
// instead of the bare global-error.tsx "ERROR" screen.
//
// Also ships the stack trace to /api/client-errors via sendBeacon so
// we can diagnose the actual root cause from production telemetry.
export default function GemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Best-effort telemetry: posthog $exception + server-side log line.
    // Both paths are independently try/catched so neither can crash this
    // already-error-state component.
    try {
      // posthog-js v1.360.x: captureException is the documented helper.
      ;(posthog as unknown as { captureException?: (e: unknown, props?: Record<string, unknown>) => void })
        .captureException?.(error, { source: 'gems_route_boundary' })
    } catch { /* posthog itself may be the thing that crashed — never throw here */ }

    try {
      const payload = JSON.stringify({
        source: 'gems_route_boundary',
        message: String(error?.message || '').slice(0, 500),
        stack: String(error?.stack || '').slice(0, 2000),
        digest: error?.digest || null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      })
      // sendBeacon survives navigation/refresh — guarantees the report
      // lands even if the user immediately hits "Try Again" or closes
      // the tab. Falls back to fetch when sendBeacon isn't available.
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/client-errors', blob)
      } else if (typeof fetch !== 'undefined') {
        fetch('/api/client-errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => { /* ignore */ })
      }
    } catch { /* ignore */ }
  }, [error])

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-5xl sm:text-7xl font-bold text-accent mb-4 uppercase">
          Oops
        </h1>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 uppercase">
          Couldn&apos;t load the gem shop
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm uppercase mb-2 leading-relaxed">
          Something glitched on our end. Your wallet and orders are safe.
        </p>
        <p className="text-gray-500 text-[10px] sm:text-xs uppercase mb-8 leading-relaxed">
          Try again, top up your wallet directly, or hit us up on Discord.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={reset}
            className="relative inline-flex items-center justify-center pixel-btn-press"
            style={{ minHeight: 48, minWidth: 140 }}
          >
            <img
              src="/images/pixel/pngs/asset-59.png"
              alt=""
              className="h-[48px] sm:h-[52px] w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-dark-900 text-[10px] sm:text-xs uppercase tracking-wider px-3">
              Try Again
            </span>
          </button>
          <Link
            href="/dashboard/deposit?source=gems_error_boundary"
            className="relative inline-flex items-center justify-center pixel-btn-press"
            style={{ textDecoration: 'none', minHeight: 48, minWidth: 140 }}
          >
            <img
              src="/images/pixel/pngs/asset-60.png"
              alt=""
              className="h-[48px] sm:h-[52px] w-auto"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs uppercase tracking-wider px-3">
              Top up Wallet
            </span>
          </Link>
        </div>
        <a
          href="https://discord.gg/sniperduels"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-6 text-pixel-blue hover:text-pixel-blue-light text-[10px] sm:text-xs uppercase font-bold tracking-wider transition-colors"
        >
          Join our Discord for help &rarr;
        </a>
        {error?.digest && (
          <p className="text-gray-600 text-[9px] mt-6 uppercase tracking-wider">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
