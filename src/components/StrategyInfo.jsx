import React, { useMemo } from 'react'

function StatCard({ label, value, color, tooltip }) {
  return (
    <div className="relative group bg-surface-700 rounded-lg p-3 border border-surface-500 flex flex-col gap-1">
      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-bold ${color}`}>
        {typeof value === 'string' ? value : (value >= 0 ? '+' : '') + `$${Math.abs(value).toFixed(2)}`}
      </span>
      {tooltip && (
        <p className="text-[11px] text-gray-500 leading-snug">{tooltip}</p>
      )}
    </div>
  )
}

export default function StrategyInfo({ strategy, params }) {
  const stats = useMemo(() => strategy.getStats(params), [strategy, params])

  const maxProfitValue =
    typeof stats.maxProfit === 'string'
      ? stats.maxProfit
      : stats.maxProfit?.label ?? `$${stats.maxProfit?.value?.toFixed(2)}`

  const maxLossValue =
    typeof stats.maxLoss === 'string'
      ? stats.maxLoss
      : stats.maxLoss?.label ?? `$${stats.maxLoss?.value?.toFixed(2)}`

  const breakevenDisplay = (stats.breakevens ?? [])
    .map((be) => `$${Number(be).toFixed(2)}`)
    .join(' & ')

  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Strategy Info</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{strategy.description}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Max Profit"
          value={maxProfitValue}
          color="text-profit"
          tooltip="Best-case outcome at expiration"
        />
        <StatCard
          label="Max Loss"
          value={maxLossValue}
          color="text-loss"
          tooltip="Worst-case outcome at expiration"
        />
        <StatCard
          label="Breakeven"
          value={breakevenDisplay || '—'}
          color="text-violet-400"
          tooltip="Price(s) where P&L = $0"
        />
      </div>

      {/* Formula hint */}
      <div className="bg-surface-900 rounded-lg px-3 py-2 border border-surface-600">
        <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
          {strategy.id === 'longCall' && 'P&L = max(0, S − K) − Premium'}
          {strategy.id === 'longPut' && 'P&L = max(0, K − S) − Premium'}
          {strategy.id === 'bullCallSpread' && 'P&L = max(0,S−K₁) − max(0,S−K₂) − (C₁−C₂)'}
          {strategy.id === 'bearPutSpread' && 'P&L = max(0,K₂−S) − max(0,K₁−S) − (P₂−P₁)'}
          {strategy.id === 'longStraddle' && 'P&L = max(0,S−K) + max(0,K−S) − (Cₓ+Pₓ)'}
          {strategy.id === 'shortStraddle' && 'P&L = (Cₓ+Pₓ) − max(0,S−K) − max(0,K−S)'}
          {strategy.id === 'ironCondor' && 'P&L = netCredit − putSpreadLoss − callSpreadLoss'}
          {strategy.id === 'coveredCall' && 'P&L = (S−cost) + premium − max(0, S−K)'}
        </p>
      </div>
    </div>
  )
}
