'use client'

interface DateRangeFilterProps {
  value: string
  onChange: (range: string) => void
}

const ranges = [
  { label: 'Today', value: '-1d' },
  { label: '7d', value: '-7d' },
  { label: '30d', value: '-30d' },
  { label: '90d', value: '-90d' },
]

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex gap-2">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs uppercase font-medium border-[2px] ${
            value === range.value
              ? 'bg-accent/20 text-accent border-accent'
              : 'bg-dark-700 text-gray-400 border-dark-500 hover:text-white hover:border-dark-400'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
