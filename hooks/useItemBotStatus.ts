'use client'

/**
 * Single polled subscription to /api/itembot/status — shared by the
 * marketplace banner and the detail-page buy panel so the page only
 * makes one network call per 30s.
 */
import { useEffect, useState } from 'react'

export interface ItemBotStatus {
  online: boolean
  state: string | null
  offlineSinceMs: number | null
  secondsAgo: number | null
}

const POLL_MS = 30_000

export function useItemBotStatus(): ItemBotStatus | null {
  const [status, setStatus] = useState<ItemBotStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    async function tick() {
      try {
        const res = await fetch('/api/itembot/status', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setStatus(data)
      } catch {
        // silently ignore — banner just stays in last state until next tick
      }
    }
    tick()
    const i = setInterval(tick, POLL_MS)
    return () => { cancelled = true; clearInterval(i) }
  }, [])

  return status
}
