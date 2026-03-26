import React, { useState, useCallback, useRef } from 'react'
import StrategySelector from './components/StrategySelector.jsx'
import StrategySimulator from './pages/StrategySimulator.jsx'
import MarketData from './pages/MarketData.jsx'
import EventReplayPage from './pages/EventReplayPage.jsx'

export default function App() {
  const [activePage, setActivePage] = useState('split')   // 'split' | 'replay'
  const [selectedStrategyId, setSelectedStrategyId] = useState('bullCallSpread')
  const [simulatorOverrides, setSimulatorOverrides] = useState(null)
  const [splitPercent, setSplitPercent] = useState(50)
  const isDragging = useRef(false)
  const containerRef = useRef(null)

  const handleLoadIntoSimulator = useCallback(({ strategyId, overrides }) => {
    setSelectedStrategyId(strategyId)
    setSimulatorOverrides(overrides)
    setActivePage('split')
  }, [])

  const simulatorKey = `${selectedStrategyId}-${JSON.stringify(simulatorOverrides)}`

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    isDragging.current = true
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.min(Math.max((x / rect.width) * 100, 25), 75)
    setSplitPercent(percent)
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return (
    <div
      className="min-h-screen bg-surface-900 flex flex-col select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Top header ── */}
      <header className="border-b border-surface-600 bg-surface-800 px-6 py-0 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 py-3">
          <span className="text-lg">📈</span>
          <span className="text-sm font-semibold text-gray-300">Options Strategy Visualizer</span>
          <span className="text-[10px] text-gray-600 hidden sm:block">educational · not financial advice</span>
        </div>

        {/* Navigation */}
        <nav className="flex">
          <button
            onClick={() => setActivePage('split')}
            className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              activePage === 'split'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>⚡</span>
            <span>Market &amp; Simulator</span>
          </button>
          <button
            onClick={() => setActivePage('replay')}
            className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              activePage === 'replay'
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>🎬</span>
            <span>Event Replay</span>
          </button>
        </nav>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {activePage === 'replay' ? (
          <EventReplayPage />
        ) : (
          /* ── Split window: Market Data | Simulator ── */
          <div ref={containerRef} className="flex flex-1 overflow-hidden">

            {/* Left panel: Market Data */}
            <div style={{ width: `${splitPercent}%` }} className="flex flex-col overflow-hidden border-r border-surface-600">
              <div className="px-4 py-2 border-b border-surface-600 bg-surface-800 shrink-0">
                <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">📊 Market Data</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <MarketData onLoadIntoSimulator={handleLoadIntoSimulator} />
              </div>
            </div>

            {/* Draggable divider */}
            <div
              onMouseDown={handleMouseDown}
              className="w-1.5 shrink-0 bg-surface-700 hover:bg-accent active:bg-accent cursor-col-resize transition-colors relative group"
              title="Drag to resize"
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-60 transition-opacity">
                <span className="w-0.5 h-0.5 rounded-full bg-white" />
                <span className="w-0.5 h-0.5 rounded-full bg-white" />
                <span className="w-0.5 h-0.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Right panel: Strategy Simulator */}
            <div style={{ width: `calc(${100 - splitPercent}% - 6px)` }} className="flex overflow-hidden">
              <nav className="w-52 shrink-0 border-r border-surface-600 bg-surface-800 overflow-y-auto">
                <div className="px-3 py-2 border-b border-surface-600">
                  <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">Strategies</span>
                </div>
                <div className="p-3">
                  <StrategySelector
                    selectedId={selectedStrategyId}
                    onSelect={(id) => {
                      setSelectedStrategyId(id)
                      setSimulatorOverrides(null)
                    }}
                  />
                </div>
              </nav>

              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-4 py-2 border-b border-surface-600 bg-surface-800 shrink-0">
                  <span className="text-xs font-semibold text-gray-400 tracking-wide uppercase">⚡ Strategy Simulator</span>
                </div>
                <main className="flex-1 overflow-y-auto p-4">
                  <StrategySimulator
                    key={simulatorKey}
                    strategyId={selectedStrategyId}
                    initialOverrides={simulatorOverrides}
                  />
                </main>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
