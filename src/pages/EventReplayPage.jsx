import React, { useState, useRef, useCallback } from 'react'
import { HISTORICAL_EVENTS } from '../data/historicalEvents.js'
import { strategiesList, strategiesById } from '../strategies/index.js'
import PayoffChart from '../components/PayoffChart.jsx'
import InputControls from '../components/InputControls.jsx'
import StrategyInfo from '../components/StrategyInfo.jsx'

function buildDefaultParams(strategy, overrides = null) {
  const defaults = Object.fromEntries(strategy.params.map((p) => [p.key, p.default]))
  if (!overrides) return defaults
  return { ...defaults, ...overrides }
}

const CATEGORY_COLORS = {
  Bullish: 'text-profit border-profit/30',
  Bearish: 'text-loss border-loss/30',
  Neutral: 'text-blue-400 border-blue-400/30',
  Volatile: 'text-amber-400 border-amber-400/30',
}

export default function EventReplayPage() {
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [strategyId, setStrategyId] = useState('longCall')
  const [params, setParams] = useState(() => buildDefaultParams(strategiesById['longCall']))
  const [replayPhase, setReplayPhase] = useState('idle') // idle | ready | animating | done
  const [replayPrice, setReplayPrice] = useState(null)
  const animFrameRef = useRef(null)

  const strategy = strategiesById[strategyId]
  const selectedEvent = HISTORICAL_EVENTS.find((e) => e.id === selectedEventId) ?? null

  function handleSelectEvent(event) {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setSelectedEventId(event.id)
    const eventParams = event.strategyParams[strategyId]
    setParams(buildDefaultParams(strategy, eventParams ?? {}))
    setReplayPhase('ready')
    setReplayPrice(null)
  }

  function handleSelectStrategy(id) {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setStrategyId(id)
    setReplayPrice(null)
    if (selectedEvent) {
      const eventParams = selectedEvent.strategyParams[id]
      setParams(buildDefaultParams(strategiesById[id], eventParams ?? {}))
      setReplayPhase('ready')
    } else {
      setParams(buildDefaultParams(strategiesById[id]))
      setReplayPhase('idle')
    }
  }

  function handleStartReplay() {
    if (!selectedEvent) return
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const start = selectedEvent.priceBeforeEvent
    const end = selectedEvent.priceAfterEvent
    const duration = 3000

    setReplayPhase('animating')
    setReplayPrice(start)

    const startTime = performance.now()
    function animate(now) {
      const t = Math.min((now - startTime) / duration, 1)
      // Ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      setReplayPrice(start + (end - start) * eased)
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setReplayPrice(end)
        setReplayPhase('done')
      }
    }
    animFrameRef.current = requestAnimationFrame(animate)
  }

  function handleReset() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setSelectedEventId(null)
    setReplayPhase('idle')
    setReplayPrice(null)
    setParams(buildDefaultParams(strategy))
  }

  const handleParamChange = useCallback((key, val) => setParams((p) => ({ ...p, [key]: val })), [])

  const pnlAtReplay = replayPrice != null ? strategy.calculate(params, replayPrice) : null
  const isPnlPositive = pnlAtReplay != null && pnlAtReplay >= 0

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar: Event list ── */}
      <aside className="w-72 shrink-0 border-r border-surface-600 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-600 bg-surface-800 shrink-0">
          <h2 className="text-sm font-bold text-white">Historical Events</h2>
          <p className="text-xs text-gray-500 mt-0.5">Pick an event to test your strategy</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {HISTORICAL_EVENTS.map((event) => {
            const isSelected = event.id === selectedEventId
            const isUp = event.direction === 'up'
            return (
              <button
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-surface-600 bg-surface-700 hover:border-surface-500 hover:bg-surface-600/80'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <span className="text-xl leading-none">{event.emoji}</span>
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${isUp ? 'text-profit bg-profit/10 border-profit/30' : 'text-loss bg-loss/10 border-loss/30'}`}>
                    {isUp ? '▲' : '▼'} {Math.abs(event.movePct).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-200 leading-tight">{event.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{event.ticker} · {event.date}</p>
                {isSelected && (
                  <p className="text-[11px] text-gray-400 mt-2 leading-snug">{event.headline}</p>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {selectedEvent ? (
          <>
            {/* Event + strategy bar */}
            <div className="border-b border-surface-600 bg-surface-800 shrink-0">
              {/* Event summary row */}
              <div className="px-6 py-2.5 flex items-center justify-between gap-4 border-b border-surface-700">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{selectedEvent.emoji}</span>
                  <span className="text-sm font-semibold text-white truncate">{selectedEvent.title}</span>
                  <span className="text-xs text-gray-500 shrink-0">{selectedEvent.ticker} · {selectedEvent.date}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-gray-400">Before: <span className="text-white font-semibold">${selectedEvent.priceBeforeEvent}</span></span>
                  <span className="text-gray-600">→</span>
                  <span className="text-gray-400">After:
                    <span className={`font-semibold ml-1 ${selectedEvent.direction === 'up' ? 'text-profit' : 'text-loss'}`}>
                      ${selectedEvent.priceAfterEvent}
                    </span>
                  </span>
                </div>
              </div>

              {/* Strategy picker row */}
              <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] text-gray-500 shrink-0 mr-1">Pick your strategy:</span>
                {strategiesList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStrategy(s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                      s.id === strategyId
                        ? `bg-accent/20 border-accent/50 text-accent`
                        : `border-surface-600 text-gray-500 hover:text-gray-300 hover:border-surface-500 ${CATEGORY_COLORS[s.category] || ''}`
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart + right panel */}
            <div className="flex flex-1 overflow-hidden">

              {/* Chart + info + replay results */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                <PayoffChart strategy={strategy} params={params} replayPrice={replayPrice} />
                <StrategyInfo strategy={strategy} params={params} />

                {/* Replay controls card */}
                <div className="card flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">Replay Controls</h3>
                    {replayPhase === 'ready' && (
                      <span className="text-[11px] text-gray-500">Params loaded for {selectedEvent.ticker} · {selectedEvent.date}</span>
                    )}
                  </div>

                  {/* Live / final P&L */}
                  {(replayPhase === 'animating' || replayPhase === 'done') && pnlAtReplay != null && (
                    <div className={`rounded-lg p-4 border ${isPnlPositive ? 'bg-profit/10 border-profit/30' : 'bg-loss/10 border-loss/30'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {replayPhase === 'animating' ? 'Live P&L' : 'Final Result'}
                        </span>
                        {replayPhase === 'animating' && (
                          <span className="text-xs text-gray-500 animate-pulse">animating…</span>
                        )}
                        {replayPhase === 'done' && replayPrice != null && (
                          <span className="text-xs text-gray-500">Price landed at ${replayPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold tabular-nums ${isPnlPositive ? 'text-profit' : 'text-loss'}`}>
                          {pnlAtReplay >= 0 ? '+' : ''}{pnlAtReplay.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500">per contract</span>
                      </div>
                      {replayPhase === 'animating' && replayPrice != null && (
                        <p className="text-xs text-gray-500 mt-1">Current price: ${replayPrice.toFixed(2)}</p>
                      )}
                    </div>
                  )}

                  {/* Lesson — after replay */}
                  {replayPhase === 'done' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">What Happened</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{selectedEvent.story}</p>
                      <p className="text-xs text-amber-300/80 leading-relaxed border-t border-amber-500/20 pt-2">{selectedEvent.learningPoint}</p>
                      <div className="flex items-center gap-4 text-xs pt-1">
                        <span className="text-gray-500">Best strategy:</span>
                        <span className="text-profit font-semibold">{strategiesById[selectedEvent.bestStrategy]?.name}</span>
                        <span className="text-gray-500">Worst:</span>
                        <span className="text-loss font-semibold">{strategiesById[selectedEvent.worstStrategy]?.name}</span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {replayPhase === 'ready' && (
                      <button
                        onClick={handleStartReplay}
                        className="flex-1 bg-accent hover:bg-accent/80 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <span>▶</span> Replay Event
                      </button>
                    )}
                    {replayPhase === 'animating' && (
                      <div className="flex-1 bg-surface-600 text-gray-400 text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed select-none">
                        <span className="animate-spin">◌</span> Replaying…
                      </div>
                    )}
                    {replayPhase === 'done' && (
                      <button
                        onClick={handleStartReplay}
                        className="flex-1 bg-surface-600 hover:bg-surface-500 text-gray-300 text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        ↺ Replay Again
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      className="bg-surface-700 hover:bg-surface-600 text-gray-400 text-sm py-2.5 px-4 rounded-lg border border-surface-600 transition-colors"
                      title="Reset"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Right panel: sliders only */}
              <div className="w-64 shrink-0 border-l border-surface-600 overflow-y-auto p-4">
                <InputControls strategy={strategy} params={params} onChange={handleParamChange} />
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-10">
            <span className="text-6xl">🎬</span>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Event Replay</h3>
              <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                Pick a historical event from the left, choose which strategy you would have used,
                then watch the payoff chart animate as the stock price moves.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {HISTORICAL_EVENTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleSelectEvent(e)}
                  className="text-xs px-3 py-1.5 rounded-full border border-surface-600 text-gray-400 hover:border-accent/50 hover:text-gray-200 transition-all"
                >
                  {e.emoji} {e.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
