'use client'

import { SparklineChart } from './SparklineChart'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  trend?: number
  sparkData?: number[]
  color?: string
}

export function MetricCard({ label, value, trend, sparkData, color = '#e1ad2d' }: MetricCardProps) {
  return (
    <div className="bg-dark-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase">{label}</span>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {sparkData && sparkData.length > 1 && (
          <SparklineChart data={sparkData} color={color} />
        )}
      </div>
    </div>
  )
}
