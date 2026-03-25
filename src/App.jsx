import React, { useState, useCallback } from 'react'
import StrategySelector from './components/StrategySelector.jsx'
import StrategySimulator from './pages/StrategySimulator.jsx'
import MarketData from './pages/MarketData.jsx'

const TABS = [
  { id: 'simulator', label: 'Strategy Simulator', icon: '⚡' },
  { id: 'market', label: 'Market Data', icon: '📊' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator')
  const [selectedStrategyId, setSelectedStrategyId] = useState('bullCallSpread')
  // Overrides from Market Data → Simulator handoff
  const [simulatorOverrides, setSimulatorOverrides] = useState(null)

  // Called by MarketData when user clicks "Use ↗" on a chain row
  const handleLoadIntoSimulator = useCallback(({ strategyId, overrides }) => {
    setSelectedStrategyId(strategyId)
    setSimulatorOverrides(overrides)
    setActiveTab('simulator')
  }, [])

  // Clear overrides once consumed by simulator (via key prop reset)
  const simulatorKey = `${selectedStrategyId}-${JSON.stringify(simulatorOverrides)}`

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* ── Top header ── */}
      <header className="border-b border-surface-600 bg-surface-800 px-6 py-0 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 py-3">
          <span className="text-lg">📈</span>
          <span className="text-sm font-semibold text-gray-300">Options Strategy Visualizer</span>
          <span className="text-[10px] text-gray-600 hidden sm:block">educational · not financial advice</span>
        </div>

        {/* Tab switcher */}
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — only shown on Simulator tab */}
        {activeTab === 'simulator' && (
          <nav className="w-64 shrink-0 border-r border-surface-600 bg-surface-800 p-4 overflow-y-auto">
            <StrategySelector selectedId={selectedStrategyId} onSelect={(id) => {
              setSelectedStrategyId(id)
              setSimulatorOverrides(null)
            }} />
          </nav>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'simulator' ? (
            <StrategySimulator
              key={simulatorKey}
              strategyId={selectedStrategyId}
              initialOverrides={simulatorOverrides}
            />
          ) : (
            <MarketData onLoadIntoSimulator={handleLoadIntoSimulator} />
          )}
        </main>
      </div>
    </div>
  )
}
