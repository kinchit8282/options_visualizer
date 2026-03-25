import React, { useState, useCallback, useMemo } from 'react'
import { strategiesById } from '../strategies/index.js'
import PayoffChart from '../components/PayoffChart.jsx'
import InputControls from '../components/InputControls.jsx'
import StrategyInfo from '../components/StrategyInfo.jsx'

// Build initial params from strategy definition, optionally merging overrides.
// NOTE: overrides are NOT clamped — sliders use dynamic bounds computed from
// the actual value so expensive stocks (NVDA $850, META $500) load correctly.
function buildDefaultParams(strategy, overrides = null) {
  const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]))
  if (!overrides) return defaults
  return { ...defaults, ...overrides }
}

export default function StrategySimulator({ strategyId, initialOverrides = null }) {
  const strategy = strategiesById[strategyId]

  const [params, setParams] = useState(() => buildDefaultParams(strategy, initialOverrides))
  const [prevStrategyId, setPrevStrategyId] = useState(strategyId)

  // Reset params when strategy changes (key prop in App handles most cases,
  // but this guards against direct prop changes without remount)
  if (strategyId !== prevStrategyId) {
    setPrevStrategyId(strategyId)
    setParams(buildDefaultParams(strategy, initialOverrides))
  }

  const handleChange = useCallback((key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Pre-loaded banner */}
      {initialOverrides && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-2 text-xs text-accent flex items-center gap-2">
          <span>⚡</span>
          <span>Pre-loaded from Market Data — strike and premium filled from live chain. Adjust sliders to explore.</span>
        </div>
      )}

      {/* Strategy header */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-white">{strategy.name}</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
          ${strategy.category === 'Bullish' ? 'text-profit border-profit/30 bg-profit/10' : ''}
          ${strategy.category === 'Bearish' ? 'text-loss border-loss/30 bg-loss/10' : ''}
          ${strategy.category === 'Neutral' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' : ''}
          ${strategy.category === 'Volatile' ? 'text-amber-400 border-amber-400/30 bg-amber-400/10' : ''}
        `}>
          {strategy.category}
        </span>
      </div>

      {/* Main layout: chart left, controls right */}
      <div className="flex gap-4 items-start">
        {/* Chart fills remaining width */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <PayoffChart strategy={strategy} params={params} />
          <StrategyInfo strategy={strategy} params={params} />
        </div>

        {/* Controls panel */}
        <div className="w-64 shrink-0">
          <InputControls strategy={strategy} params={params} onChange={handleChange} />
        </div>
      </div>
    </div>
  )
}
