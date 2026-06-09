'use client'

/**
 * Item-bot status tile for the admin dashboard.
 * Shows: online dot, current HealthState, emulator/Roblox liveness, time since
 * last heartbeat. Polls /api/admin/itembot-status every 15s.
 */
import { useState, useEffect } from 'react'
import { Smartphone, Gamepad2, Trophy, Activity, AlertCircle } from 'lucide-react'

interface ItemBotData {
  online: boolean
  secondsAgo: number | null
  lastHeartbeat: number | null
  state: string | null
  emulatorOnline: boolean | null
  robloxOnline: boolean | null
  inSniperDuels: boolean | null
  adbDevice: string | null
  uptimeS: number | null
}

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  lobby:          { label: 'In Lobby · ready',          color: 'text-emerald-400' },
  in_duel:        { label: 'In a Duel',                 color: 'text-amber-400' },
  trade_panel:    { label: 'Trade panel open',          color: 'text-sky-400' },
  trade_window:   { label: 'In trade window',           color: 'text-sky-400' },
  home:           { label: 'Roblox home (not in-game)', color: 'text-zinc-400' },
  roblox_loading: { label: 'Roblox loading',            color: 'text-zinc-400' },
  roblox_down:    { label: 'Roblox crashed / closed',   color: 'text-red-400' },
  emulator_down:  { label: 'Emulator offline',          color: 'text-red-400' },
  unknown:        { label: 'Unknown state',             color: 'text-zinc-500' },
}

export default function ItemBotStatus() {
  const [data, setData] = useState<ItemBotData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function tick() {
      try {
        const res = await fetch('/api/admin/itembot-status')
        if (res.ok && !cancelled) setData(await res.json())
      } catch { /* silently fail */ }
    }
    tick()
    const i = setInterval(tick, 15_000)
    return () => { cancelled = true; clearInterval(i) }
  }, [])

  if (!data) return null

  const stateInfo = (data.state ? STATE_LABELS[data.state] : null) ?? { label: 'Offline · no heartbeat', color: 'text-red-400' }

  return (
    <div className={`rounded-2xl border p-5 mb-4 ${
      data.online
        ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30'
        : 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${data.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <h2 className="text-white font-semibold text-sm">Item Trade Bot</h2>
          {data.adbDevice && (
            <span className="text-[10px] text-zinc-500 font-mono">{data.adbDevice}</span>
          )}
        </div>
        <div className="text-xs text-zinc-400">
          {data.lastHeartbeat
            ? <>last seen <span className={data.online ? 'text-emerald-400' : 'text-red-400'}>{formatAgo(data.secondsAgo!)}</span></>
            : 'never connected'}
        </div>
      </div>

      <div className={`text-base font-medium ${stateInfo.color} mb-3 flex items-center gap-2`}>
        <Activity className="w-4 h-4" />
        {stateInfo.label}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Sig icon={<Smartphone className="w-3.5 h-3.5" />} label="Emulator" on={data.emulatorOnline} />
        <Sig icon={<Gamepad2 className="w-3.5 h-3.5" />} label="Roblox" on={data.robloxOnline} />
        <Sig icon={<Trophy className="w-3.5 h-3.5" />} label="In SD" on={data.inSniperDuels} />
      </div>

      {!data.online && data.lastHeartbeat && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Bot has not checked in for over 2 minutes. New item orders are paused until it reconnects.</span>
        </div>
      )}
    </div>
  )
}

function Sig({ icon, label, on }: { icon: React.ReactNode; label: string; on: boolean | null }) {
  const color = on === null ? 'text-zinc-500 bg-zinc-800/50' : on ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
  return (
    <div className={`rounded-lg px-2 py-1.5 flex items-center gap-1.5 ${color}`}>
      {icon}
      <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      <span className="ml-auto text-[10px]">
        {on === null ? '—' : on ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
