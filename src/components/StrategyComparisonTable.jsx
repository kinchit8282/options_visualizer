import React, { useMemo, useState } from 'react'
import { getAllStrategiesData } from '../data/recommendations.js'

const CATEGORY_STYLE = {
  Bullish:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  Bearish:  'text-red-400 bg-red-400/10 border-red-400/30',
  Neutral:  'text-blue-400 bg-blue-400/10 border-blue-400/30',
  Volatile: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
}

const SCORE_BAR_COLOR = (score) =>
  score >= 75 ? 'bg-emerald-500' : score >= 55 ? 'bg-amber-400' : 'bg-gray-500'

function fmt(val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'string') return val   // 'Unlimited', 'Theoretically unlimited…', etc.
  if (typeof val === 'object' && val.label) return val.label
  return `$${Math.abs(val).toFixed(2)}`
}

function fmtBreakevens(breakevens) {
  if (!breakevens?.length) return '—'
  return breakevens.map((b) => `$${b.toFixed(2)}`).join(' / ')
}

function PnlCell({ value, positive }) {
  const text = fmt(value)
  const isUnlimited = typeof value === 'string'
  const colorClass = positive
    ? isUnlimited ? 'text-emerald-400' : 'text-emerald-400'
    : isUnlimited ? 'text-red-400'     : 'text-red-400'
  return <span className={`tabular-nums font-semibold ${colorClass}`}>{text}</span>
}

export default function StrategyComparisonTable({ stockData, onLoadIntoSimulator }) {
  const [sortBy, setSortBy] = useState('score')  // 'score' | 'maxProfit' | 'maxLoss'
  const [expandedId, setExpandedId] = useState(null)

  const rows = useMemo(() => {
    if (!stockData) return []
    return getAllStrategiesData(stockData)
  }, [stockData])

  const sorted = useMemo(() => {
    if (sortBy === 'score') return rows  // already sorted by score
    return [...rows].sort((a, b) => {
      const va = a.stats?.[sortBy]
      const vb = b.stats?.[sortBy]
      const na = typeof va === 'object' ? (va?.value ?? 0) : (typeof va === 'number' ? va : 0)
      const nb = typeof vb === 'object' ? (vb?.value ?? 0) : (typeof vb === 'number' ? vb : 0)
      return sortBy === 'maxLoss' ? na - nb : nb - na
    })
  }, [rows, sortBy])

  if (!stockData || rows.length === 0) return null

  function SortButton({ col, label }) {
    return (
      <button
        onClick={() => setSortBy(col)}
        className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-all ${
          sortBy === col
            ? 'text-accent bg-accent/10 border border-accent/30'
            : 'text-gray-600 hover:text-gray-400'
        }`}
      >
        {label} {sortBy === col ? '↓' : ''}
      </button>
    )
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">All Strategies — Return Comparison</h3>
          <p className="text-[11px] text-gray-600 mt-0.5">
            Expected P&amp;L for each strategy using suggested strikes from the options chain
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-600 mr-1">Sort by</span>
          <SortButton col="score"     label="Score" />
          <SortButton col="maxProfit" label="Max Profit" />
          <SortButton col="maxLoss"   label="Max Loss" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-surface-600">
              <th className="text-left py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium w-16">Score</th>
              <th className="text-left py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium">Strategy</th>
              <th className="text-left py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium hidden sm:table-cell">Risk / Reward</th>
              <th className="text-right py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium">Max Profit</th>
              <th className="text-right py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium">Max Loss</th>
              <th className="text-right py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium hidden md:table-cell">Breakeven(s)</th>
              <th className="py-2 px-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const isExpanded = expandedId === row.strategyId
              const canLoad = !!row.setup?.simulatorLoad
              return (
                <React.Fragment key={row.strategyId}>
                  <tr
                    className={`border-b border-surface-700 transition-colors cursor-pointer
                      ${isExpanded ? 'bg-surface-700' : 'hover:bg-surface-700/50'}`}
                    onClick={() => setExpandedId(isExpanded ? null : row.strategyId)}
                  >
                    {/* Score */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1">
                        <span className={`font-bold tabular-nums ${
                          row.score >= 75 ? 'text-emerald-400'
                          : row.score >= 55 ? 'text-amber-400'
                          : 'text-gray-500'
                        }`}>
                          {row.score}
                        </span>
                        <div className="w-10 h-1 bg-surface-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${SCORE_BAR_COLOR(row.score)}`}
                            style={{ width: `${row.score}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Strategy name */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{row.name}</span>
                          {i === 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold">
                              TOP PICK
                            </span>
                          )}
                        </div>
                        <span className={`self-start text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_STYLE[row.category] ?? 'text-gray-400 border-gray-600'}`}>
                          {row.category}
                        </span>
                      </div>
                    </td>

                    {/* Risk / Reward */}
                    <td className="py-2.5 px-3 hidden sm:table-cell">
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <span className="text-gray-500">Risk: <span className="text-gray-300">{row.risk}</span></span>
                        <span className="text-gray-500">Reward: <span className="text-gray-300">{row.reward}</span></span>
                      </div>
                    </td>

                    {/* Max Profit */}
                    <td className="py-2.5 px-3 text-right">
                      {row.stats ? (
                        <PnlCell value={row.stats.maxProfit} positive={true} />
                      ) : <span className="text-gray-600">—</span>}
                    </td>

                    {/* Max Loss */}
                    <td className="py-2.5 px-3 text-right">
                      {row.stats ? (
                        <PnlCell value={row.stats.maxLoss} positive={false} />
                      ) : <span className="text-gray-600">—</span>}
                    </td>

                    {/* Breakevens */}
                    <td className="py-2.5 px-3 text-right text-gray-400 hidden md:table-cell">
                      {row.stats ? fmtBreakevens(row.stats.breakevens) : '—'}
                    </td>

                    {/* Load button */}
                    <td className="py-2.5 px-3">
                      <button
                        disabled={!canLoad}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (canLoad) onLoadIntoSimulator(row.setup.simulatorLoad)
                        }}
                        className={`text-[10px] px-2 py-1 rounded border transition-all whitespace-nowrap ${
                          canLoad
                            ? 'border-accent/40 text-accent hover:bg-accent/10'
                            : 'border-surface-600 text-gray-700 cursor-not-allowed'
                        }`}
                      >
                        Load ↗
                      </button>
                    </td>
                  </tr>

                  {/* Expanded rationale row */}
                  {isExpanded && (
                    <tr className="bg-surface-700/60 border-b border-surface-600">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <p className="text-[11px] text-gray-400 leading-relaxed">{row.rationale}</p>
                          {row.setup?.description && (
                            <p className="text-[11px] text-accent/80 font-mono">
                              Suggested: {row.setup.description}
                            </p>
                          )}
                          {row.setup?.legs && (
                            <div className="flex gap-3 flex-wrap mt-1">
                              {row.setup.legs.map((leg, li) => (
                                <span key={li} className="text-[10px] bg-surface-600 rounded px-2 py-1 text-gray-300">
                                  {leg.label} K=${leg.strike} @ ${leg.premium.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-700">
        P&amp;L stats computed from suggested strikes · Click any row to expand rationale and legs · "Load ↗" sends setup to Simulator
      </p>
    </div>
  )
}
