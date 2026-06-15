interface CheckoutStepsProps {
  /** 1 = Pick Gems, 2 = Add Funds, 3 = Confirm, 4 = Delivery */
  current: 1 | 2 | 3 | 4
  className?: string
}

const STEPS = ['Pick Gems', 'Add Funds', 'Confirm', 'Delivery'] as const

/**
 * Persistent 4-step progress bar shown across the gem purchase funnel so users
 * always know where they are and what's next:
 *   Pick Gems → Add Funds → Confirm → Delivery
 *
 * Presentational only (no hooks) — safe to import into client pages. Visual
 * language matches the pixel theme (accent gold = done/active, dark = upcoming).
 */
export function CheckoutSteps({ current, className = '' }: CheckoutStepsProps) {
  return (
    <div className={`w-full max-w-xl mx-auto mb-6 ${className}`} aria-label="Checkout progress">
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const step = (i + 1) as 1 | 2 | 3 | 4
          const done = step < current
          const active = step === current
          const reached = step <= current

          // Badge styling
          const badgeStyle: React.CSSProperties = reached
            ? {
                background: active ? '#e1ad2d' : 'rgba(225,173,45,0.18)',
                border: '2px solid #e1ad2d',
                color: active ? '#0a0a0b' : '#e1ad2d',
                boxShadow: active ? '2px 2px 0px #000' : undefined,
              }
            : {
                background: '#1a1a1e',
                border: '2px solid #2e2e35',
                color: '#6b7280',
              }

          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center text-center shrink-0">
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-[11px] sm:text-xs"
                  style={badgeStyle}
                >
                  {done ? '✓' : step}
                </div>
                <span
                  className={`mt-1.5 text-[8px] sm:text-[10px] uppercase tracking-wider font-bold leading-none ${
                    active ? 'text-accent' : reached ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  {label}
                </span>
              </div>
              {/* Connector to next step */}
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-[2px] mx-1.5 sm:mx-2 -mt-4"
                  style={{ background: step < current ? '#e1ad2d' : '#2e2e35' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
