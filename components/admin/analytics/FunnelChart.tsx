'use client'

interface FunnelStep {
  label: string
  count: number
}

interface FunnelChartProps {
  steps: FunnelStep[]
}

export function FunnelChart({ steps }: FunnelChartProps) {
  if (steps.length === 0) return null

  const maxCount = steps[0].count || 1

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const pct = Math.round((step.count / maxCount) * 100)
        const dropoff = i > 0 ? steps[i - 1].count - step.count : 0
        const dropoffPct = i > 0 && steps[i - 1].count > 0
          ? Math.round((dropoff / steps[i - 1].count) * 100)
          : 0

        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 uppercase">{step.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white font-bold">{step.count.toLocaleString()}</span>
                {i > 0 && (
                  <span className="text-xs text-red-400">-{dropoffPct}%</span>
                )}
              </div>
            </div>
            <div className="h-6 bg-dark-700 relative overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: i === steps.length - 1 ? '#22c55e' : '#e1ad2d',
                  opacity: 0.3 + (0.7 * pct / 100),
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
