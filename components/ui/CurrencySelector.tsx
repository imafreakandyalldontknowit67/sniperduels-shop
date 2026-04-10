'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCurrency } from '@/components/providers'
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '@/lib/currency'

export function CurrencySelector({ compact, dropUp }: { compact?: boolean; dropUp?: boolean }) {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = SUPPORTED_CURRENCIES[currency]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs font-medium ${compact ? 'text-[10px] px-1.5 py-0.5' : ''}`}
      >
        <span>{current.symbol}</span>
        <span>{currency}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute right-0 z-50 bg-[#1a1a1f] border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px] max-h-[300px] overflow-y-auto ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {(Object.entries(SUPPORTED_CURRENCIES) as [CurrencyCode, typeof current][]).map(([code, info]) => (
            <button
              key={code}
              onClick={() => { setCurrency(code); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors ${
                code === currency ? 'text-cyan-400 bg-white/5' : 'text-white/70'
              }`}
            >
              <span className="w-5 text-center font-medium">{info.symbol}</span>
              <span>{code}</span>
              <span className="text-white/40 text-xs ml-auto">{info.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
