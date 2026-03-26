import React, { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { generateChartData } from '../strategies/index.js'

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const pnl = payload.find((p) => p.dataKey === 'profit' || p.dataKey === 'loss')
  const value = payload[0]?.payload?.pnl ?? 0
  const isProfit = value >= 0

  return (
    <div className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-gray-400 mb-1">Stock Price: <span className="text-white font-semibold">${Number(label).toFixed(2)}</span></p>
      <p className={isProfit ? 'text-profit font-bold' : 'text-loss font-bold'}>
        P&L: {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </p>
    </div>
  )
}

// ─── Breakeven Label ──────────────────────────────────────────────────────────

function BreakevenLabel({ viewBox, value }) {
  const { x, y } = viewBox
  return (
    <g>
      <rect x={x - 30} y={y - 22} width={60} height={18} rx={4} fill="#252d40" />
      <text x={x} y={y - 9} textAnchor="middle" fill="#a78bfa" fontSize={11} fontWeight={600}>
        BE: ${Number(value).toFixed(1)}
      </text>
    </g>
  )
}

// ─── PayoffChart ──────────────────────────────────────────────────────────────

// ─── Replay Price Label ───────────────────────────────────────────────────────

function ReplayLabel({ viewBox, pnl }) {
  const { x, y } = viewBox
  const isProfit = pnl >= 0
  const color = isProfit ? '#22c55e' : '#ef4444'
  const text = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
  const width = Math.max(text.length * 7, 56)
  return (
    <g>
      <rect x={x - width / 2} y={y - 24} width={width} height={18} rx={4} fill={color} fillOpacity={0.9} />
      <text x={x} y={y - 11} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>
        {text}
      </text>
    </g>
  )
}

export default function PayoffChart({ strategy, params, replayPrice = null }) {
  const data = useMemo(() => generateChartData(strategy, params), [strategy, params])

  const stats = useMemo(() => strategy.getStats(params), [strategy, params])

  const stockPrice = params.stockPrice ?? 100

  // Dynamic Y-axis domain with padding
  const allPnl = data.map((d) => d.pnl)
  const minPnl = Math.min(...allPnl)
  const maxPnl = Math.max(...allPnl)
  const pad = Math.max((maxPnl - minPnl) * 0.15, 2)
  const yMin = Math.floor(minPnl - pad)
  const yMax = Math.ceil(maxPnl + pad)

  const xMin = data[0]?.price
  const xMax = data[data.length - 1]?.price

  const breakevenPoints = stats.breakevens ?? []

  const replayPnl = replayPrice != null ? strategy.calculate(params, replayPrice) : null

  return (
    <div className="card w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-200">Profit / Loss at Expiration</h2>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-profit/70 inline-block" />
            <span className="text-gray-400">Profit Zone</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-loss/70 inline-block" />
            <span className="text-gray-400">Loss Zone</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data} margin={{ top: 20, right: 24, left: 8, bottom: 8 }}>
          <defs>
            {/* Profit gradient */}
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
            {/* Loss gradient */}
            <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.05} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.35} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#2e3a52" vertical={false} />

          <XAxis
            dataKey="price"
            type="number"
            domain={[xMin, xMax]}
            tickFormatter={(v) => `$${v}`}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={{ stroke: '#2e3a52' }}
            tickLine={false}
            tickCount={8}
          />

          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => `$${v}`}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />

          {/* Zero baseline */}
          <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1.5} />

          {/* Current stock price */}
          <ReferenceLine
            x={stockPrice}
            stroke="#6366f1"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            label={{ value: `S = $${stockPrice}`, position: 'top', fill: '#818cf8', fontSize: 11, fontWeight: 600 }}
          />

          {/* Breakeven lines */}
          {breakevenPoints.map((be, i) => (
            <ReferenceLine
              key={`be-${i}`}
              x={be}
              stroke="#a78bfa"
              strokeWidth={1}
              strokeDasharray="3 3"
              label={<BreakevenLabel value={be} />}
            />
          ))}

          {/* Profit area (pnl ≥ 0) */}
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#profitGrad)"
            isAnimationActive={false}
            dot={false}
            activeDot={false}
            legendType="none"
          />

          {/* Loss area (pnl < 0) */}
          <Area
            type="monotone"
            dataKey="loss"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#lossGrad)"
            isAnimationActive={false}
            dot={false}
            activeDot={false}
            legendType="none"
          />

          {/* Replay price marker — animated */}
          {replayPrice != null && replayPnl != null && (
            <ReferenceLine
              x={replayPrice}
              stroke={replayPnl >= 0 ? '#22c55e' : '#ef4444'}
              strokeWidth={2.5}
              label={<ReplayLabel pnl={replayPnl} />}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
