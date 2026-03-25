import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      <p className="text-gray-400">Day {label}</p>
      <p className="text-white font-bold">${payload[0]?.value?.toFixed(2)}</p>
    </div>
  )
}

export default function PriceHistoryChart({ data, currentPrice, color = '#6366f1' }) {
  const startPrice = data[0]?.price ?? currentPrice
  const isPositive = currentPrice >= startPrice

  const chartColor = isPositive ? '#22c55e' : '#ef4444'

  const prices = data.map((d) => d.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const pad = (maxP - minP) * 0.12

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`histGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" hide />
        <YAxis domain={[minP - pad, maxP + pad]} hide />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1 }} />
        <ReferenceLine y={startPrice} stroke="#4b5563" strokeDasharray="3 3" strokeWidth={1} />
        <Area
          type="monotone"
          dataKey="price"
          stroke={chartColor}
          strokeWidth={1.5}
          fill={`url(#histGrad-${color})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
