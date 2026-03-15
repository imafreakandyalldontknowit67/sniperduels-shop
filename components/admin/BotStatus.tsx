'use client'

import { useState, useEffect } from 'react'

interface BotStatusData {
  online: boolean
  secondsAgo: number | null
  lastHeartbeat: number | null
}

export default function BotStatus() {
  const [status, setStatus] = useState<BotStatusData | null>(null)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/admin/bot-status')
        if (res.ok) {
          setStatus(await res.json())
        }
      } catch {
        // silently fail
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 15_000)
    return () => clearInterval(interval)
  }, [])

  if (!status) return null

  const dotColor = status.online ? 'bg-green-400' : 'bg-red-400'
  const label = status.online
    ? 'Trade Bot Online'
    : status.lastHeartbeat
      ? `Trade Bot Offline (last seen ${formatAgo(status.secondsAgo!)})`
      : 'Trade Bot Offline (never connected)'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 ${
      status.online ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
    }`}>
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${status.online ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-medium ${status.online ? 'text-green-400' : 'text-red-400'}`}>
        {label}
      </span>
    </div>
  )
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
