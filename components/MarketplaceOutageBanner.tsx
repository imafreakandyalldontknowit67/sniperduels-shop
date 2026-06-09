'use client'

/**
 * Marketplace-specific outage banner — driven by /api/itembot/status.
 *
 * Different from components/OutageBanner.tsx (which watches the gem bot and
 * is wallet/topup-flavored). This one is item-bot only and the messaging
 * reflects the queue-for-fulfillment product model: orders still go through
 * during an outage and ship automatically once the bot reconnects.
 *
 * Copy is tuned to the item bot's 9-state HealthState so transient busy
 * states (in_duel, trade_panel) get short / soft strips while real outages
 * (roblox_down, emulator_down, no heartbeat) get the amber treatment.
 */
import { Clock, Swords, Handshake, AlertTriangle } from 'lucide-react'
import { useItemBotStatus, type ItemBotStatus } from '@/hooks/useItemBotStatus'

interface BannerCopy {
  tone: 'info' | 'warn'
  icon: React.ReactNode
  title: string
  body: string
}

function copyFor(s: ItemBotStatus | null): BannerCopy | null {
  if (!s) return null

  // Happy path — bot is in lobby / online with no transient state
  if (s.online && (s.state === 'lobby' || s.state === null || s.state === 'home')) {
    return null
  }

  // Transient busy — info-tone strip, not amber
  if (s.online && s.state === 'in_duel') {
    // Don't flicker on a duel that just started
    if (s.secondsAgo !== null && s.secondsAgo < 30) return null
    return {
      tone: 'info',
      icon: <Swords className="w-4 h-4" />,
      title: 'Bot is in a duel',
      body: 'Short wait — queue your order and it goes next.',
    }
  }
  if (s.online && (s.state === 'trade_panel' || s.state === 'trade_window')) {
    return {
      tone: 'info',
      icon: <Handshake className="w-4 h-4" />,
      title: 'Bot is mid-trade',
      body: 'Your order is next in line.',
    }
  }
  if (s.online && s.state === 'roblox_loading') {
    return {
      tone: 'info',
      icon: <Clock className="w-4 h-4" />,
      title: 'Bot is reconnecting',
      body: 'Your order will ship as soon as it lands in the lobby.',
    }
  }

  // True outage — amber strip
  return {
    tone: 'warn',
    icon: <AlertTriangle className="w-4 h-4" />,
    title: s.offlineSinceMs ? 'Bot is offline' : 'Bot is offline',
    body:
      'Your order will be queued and delivered automatically when the bot is back. ' +
      'Most outages resolve in under 30 minutes.',
  }
}

function formatAgo(seconds: number | null): string | null {
  if (seconds === null) return null
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export default function MarketplaceOutageBanner() {
  const status = useItemBotStatus()
  const copy = copyFor(status)
  if (!copy) return null

  const isWarn = copy.tone === 'warn'
  const wrapper = isWarn
    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
    : 'bg-sky-500/10 border-sky-500/40 text-sky-200'
  const iconColor = isWarn ? 'text-amber-400' : 'text-sky-400'
  const ago = formatAgo(status?.secondsAgo ?? null)

  return (
    <div className={`border ${wrapper} rounded-lg px-3 md:px-4 py-2.5 md:py-3 mx-3 md:mx-auto md:max-w-5xl mt-3 md:mt-4`}>
      <div className="flex items-start gap-2.5">
        <div className={`shrink-0 mt-0.5 ${iconColor}`}>{copy.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            <span>{copy.title}</span>
            {ago && isWarn && (
              <span className="text-[10px] uppercase tracking-wider opacity-70">{ago}</span>
            )}
          </div>
          <div className="text-xs md:text-sm opacity-90 mt-0.5">{copy.body}</div>
        </div>
      </div>
    </div>
  )
}
