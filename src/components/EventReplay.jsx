import React, { useState } from 'react'
import { HISTORICAL_EVENTS } from '../data/historicalEvents.js'
import { strategiesById } from '../strategies/index.js'

// ─── Direction badge ───────────────────────────────────────────────────────────
function MoveBadge({ movePct, direction }) {
  const color = direction === 'up' ? 'text-profit bg-profit/10 border-profit/30' : 'text-loss bg-loss/10 border-loss/30'
  const arrow = direction === 'up' ? '▲' : '▼'
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${color}`}>
      {arrow} {Math.abs(movePct).toFixed(1)}%
    </span>
  )
}

// ─── EventReplay ───────────────────────────────────────────────────────────────
export default function EventReplay({
  currentStrategyId,
  replayPhase,      // 'idle' | 'ready' | 'animating' | 'done'
  replayPrice,      // number | null — animated price
  pnlAtReplay,      // number | null
  onLoadEvent,      // (event) => void
  onStartReplay,    // () => void
  onResetReplay,    // () => void
}) {
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [open, setOpen] = useState(true)

  const selectedEvent = HISTORICAL_EVENTS.find((e) => e.id === selectedEventId) ?? null
  const strategy = strategiesById[currentStrategyId]

  function handleSelectEvent(event) {
    setSelectedEventId(event.id)
    onLoadEvent(event)
  }

  function handleReset() {
    setSelectedEventId(null)
    onResetReplay()
  }

  const isPnlPositive = pnlAtReplay != null && pnlAtReplay >= 0
  const pnlColor = isPnlPositive ? 'text-profit' : 'text-loss'

  return (
    <div className="card flex flex-col gap-3">
      {/* Header row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎬</span>
          <span className="text-sm font-semibold text-gray-200">Historical Event Replay</span>
          <span className="text-[10px] text-gray-500 bg-surface-700 border border-surface-600 px-1.5 py-0.5 rounded">
            {HISTORICAL_EVENTS.length} events
          </span>
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {!open && selectedEvent && replayPhase !== 'idle' && (
        <div className="text-xs text-gray-500">
          {selectedEvent.emoji} {selectedEvent.title} loaded —{' '}
          <button onClick={() => setOpen(true)} className="text-accent underline">show</button>
        </div>
      )}

      {open && (
        <>
          {/* Event picker grid */}
          <div className="grid grid-cols-2 gap-2">
            {HISTORICAL_EVENTS.map((event) => {
              const isSelected = event.id === selectedEventId
              return (
                <button
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className={`text-left p-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-surface-600 bg-surface-700 hover:border-surface-500 hover:bg-surface-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-base leading-none">{event.emoji}</span>
                    <MoveBadge movePct={event.movePct} direction={event.direction} />
                  </div>
                  <p className="text-[12px] font-semibold text-gray-200 leading-tight">{event.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {event.ticker} · {event.date}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Selected event detail + replay controls */}
          {selectedEvent && (
            <div className="border border-surface-600 rounded-lg bg-surface-700/50 p-3 flex flex-col gap-3">
              {/* Headline + prices */}
              <div>
                <p className="text-xs font-semibold text-gray-300 mb-1 leading-snug">
                  {selectedEvent.headline}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Before: <span className="text-white font-semibold">${selectedEvent.priceBeforeEvent}</span></span>
                  <span className="text-gray-600">→</span>
                  <span>After: <span className={`font-semibold ${selectedEvent.direction === 'up' ? 'text-profit' : 'text-loss'}`}>${selectedEvent.priceAfterEvent}</span></span>
                  <MoveBadge movePct={selectedEvent.movePct} direction={selectedEvent.direction} />
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">{selectedEvent.story}</p>

              {/* P&L result during/after animation */}
              {(replayPhase === 'animating' || replayPhase === 'done') && pnlAtReplay != null && (
                <div className={`rounded-lg p-3 border ${isPnlPositive ? 'bg-profit/10 border-profit/30' : 'bg-loss/10 border-loss/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">
                      {replayPhase === 'animating' ? 'Live P&L' : 'Final Result'}
                    </span>
                    {replayPhase === 'animating' && (
                      <span className="text-[10px] text-gray-500 animate-pulse">replaying…</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${pnlColor}`}>
                      {pnlAtReplay >= 0 ? '+' : ''}{pnlAtReplay.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">per contract (1 lot)</span>
                  </div>
                  {replayPhase === 'animating' && replayPrice != null && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Price: ${replayPrice.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Learning point — shown after replay */}
              {replayPhase === 'done' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-amber-400 mb-1">Lesson</p>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">{selectedEvent.learningPoint}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <span className="text-gray-500">Best strategy:</span>
                    <span className="text-profit font-semibold">
                      {strategiesById[selectedEvent.bestStrategy]?.name}
                    </span>
                    <span className="text-gray-500">Worst:</span>
                    <span className="text-loss font-semibold">
                      {strategiesById[selectedEvent.worstStrategy]?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {replayPhase === 'ready' && (
                  <button
                    onClick={onStartReplay}
                    className="flex-1 bg-accent hover:bg-accent/80 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>▶</span>
                    <span>Replay Event</span>
                  </button>
                )}

                {replayPhase === 'animating' && (
                  <div className="flex-1 bg-surface-600 text-gray-400 text-sm font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                    <span className="animate-spin inline-block">◌</span>
                    <span>Replaying…</span>
                  </div>
                )}

                {replayPhase === 'done' && (
                  <button
                    onClick={onStartReplay}
                    className="flex-1 bg-surface-600 hover:bg-surface-500 text-gray-300 text-sm font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span>↺</span>
                    <span>Replay Again</span>
                  </button>
                )}

                <button
                  onClick={handleReset}
                  className="bg-surface-700 hover:bg-surface-600 text-gray-400 text-sm py-2 px-3 rounded-lg transition-colors border border-surface-600"
                  title="Reset / pick different event"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
