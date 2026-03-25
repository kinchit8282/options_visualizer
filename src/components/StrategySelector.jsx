import React from 'react'
import { strategiesByCategory, CATEGORIES } from '../strategies/index.js'

const CATEGORY_COLORS = {
  [CATEGORIES.BULLISH]: 'text-profit border-profit/30 bg-profit/10',
  [CATEGORIES.BEARISH]: 'text-loss border-loss/30 bg-loss/10',
  [CATEGORIES.NEUTRAL]: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  [CATEGORIES.VOLATILE]: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
}

const CATEGORY_ICONS = {
  [CATEGORIES.BULLISH]: '↑',
  [CATEGORIES.BEARISH]: '↓',
  [CATEGORIES.NEUTRAL]: '↔',
  [CATEGORIES.VOLATILE]: '↕',
}

export default function StrategySelector({ selectedId, onSelect }) {
  return (
    <aside className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
      <div className="px-1 mb-2">
        <h1 className="text-base font-bold text-white tracking-tight">Options Visualizer</h1>
        <p className="text-xs text-gray-500 mt-0.5">Select a strategy to explore</p>
      </div>

      {Object.values(CATEGORIES).map((cat) => {
        const strategies = strategiesByCategory[cat]
        if (!strategies?.length) return null
        const colorClass = CATEGORY_COLORS[cat]
        const icon = CATEGORY_ICONS[cat]

        return (
          <div key={cat}>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold uppercase tracking-widest border ${colorClass} mb-1`}>
              <span>{icon}</span>
              <span>{cat}</span>
            </div>

            <div className="flex flex-col gap-0.5 pl-1">
              {strategies.map((s) => {
                const isActive = s.id === selectedId
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                      ${isActive
                        ? 'bg-accent/20 border border-accent/40 text-white'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700 border border-transparent'
                      }
                    `}
                  >
                    <span className="font-medium block">{s.name}</span>
                    <span className="text-[11px] text-gray-500 leading-tight block mt-0.5">{s.shortDesc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </aside>
  )
}
