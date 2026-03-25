import React, { useState } from 'react'

// ─── Small helpers ────────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }) {
  const cls =
    confidence === 'High'     ? 'bg-profit/15 text-profit border-profit/30' :
    confidence === 'Moderate' ? 'bg-amber-400/15 text-amber-400 border-amber-400/30' :
                                'bg-gray-500/15 text-gray-400 border-gray-500/30'
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cls}`}>
      {confidence} fit
    </span>
  )
}

function ScoreBar({ score }) {
  const color =
    score >= 75 ? 'bg-profit' :
    score >= 55 ? 'bg-amber-400' :
                  'bg-gray-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums text-gray-300 w-8 text-right">{score}</span>
    </div>
  )
}

function SignalPill({ signal }) {
  const { label, value, positive, note } = signal
  const colorValue =
    positive === true  ? 'text-profit' :
    positive === false ? 'text-loss'   :
                         'text-gray-300'
  return (
    <div className="group relative">
      <div className="flex items-center gap-1.5 bg-surface-600 border border-surface-500 rounded-lg px-2.5 py-1.5 cursor-default">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide whitespace-nowrap">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${colorValue}`}>{value}</span>
        {positive === true  && <span className="text-profit text-[10px]">✓</span>}
        {positive === false && <span className="text-loss text-[10px]">✗</span>}
      </div>
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-0 mb-2 w-52 bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-[11px] text-gray-300 shadow-xl z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
        {note}
      </div>
    </div>
  )
}

function LegBadge({ leg }) {
  const isBuy = leg.label.toLowerCase().includes('buy')
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
      isBuy
        ? 'text-profit bg-profit/10 border-profit/25'
        : 'text-loss bg-loss/10 border-loss/25'
    }`}>
      {leg.label} ${leg.strike}
    </span>
  )
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }) {
  const styles = [
    'bg-amber-400/20 text-amber-400 border-amber-400/40',  // 1st
    'bg-gray-400/15 text-gray-300 border-gray-400/30',     // 2nd
    'bg-orange-700/20 text-orange-400 border-orange-600/30', // 3rd
  ]
  const labels = ['1st', '2nd', '3rd']
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[rank - 1]}`}>
      #{labels[rank - 1]}
    </span>
  )
}

// ─── Single recommendation card ───────────────────────────────────────────────

function RecommendationCard({ rec, onTryIt }) {
  const [expanded, setExpanded] = useState(rec.rank === 1)
  const { name, category, categoryColor, score, confidence, rationale, risk, reward, setup, keySignals, rank } = rec

  return (
    <div className={`bg-surface-800 border rounded-xl overflow-hidden transition-all ${
      rank === 1 ? 'border-accent/40' : 'border-surface-600'
    }`}>
      {/* ── Header (always visible) ── */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-700/40 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <RankBadge rank={rank} />
          <span className="text-sm font-bold text-white">{name}</span>
          <span className={`text-xs font-semibold ${categoryColor}`}>{category}</span>
          <ConfidenceBadge confidence={confidence} />
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="w-28 hidden sm:block">
            <ScoreBar score={score} />
          </div>
          <span className="text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-surface-600">
          {/* Score bar (mobile) */}
          <div className="sm:hidden pt-3">
            <ScoreBar score={score} />
          </div>

          {/* Signals row */}
          <div className="pt-3 flex flex-wrap gap-2">
            {keySignals.map((s) => (
              <SignalPill key={s.label} signal={s} />
            ))}
          </div>

          {/* Rationale */}
          <p className="text-sm text-gray-400 leading-relaxed">{rationale}</p>

          {/* Risk / Reward */}
          <div className="flex gap-3">
            <div className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-gray-500">Max Risk: </span>
              <span className={`font-semibold ${risk === 'Unlimited' ? 'text-red-400' : 'text-gray-200'}`}>{risk}</span>
            </div>
            <div className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-gray-500">Max Reward: </span>
              <span className={`font-semibold ${reward === 'Unlimited' ? 'text-profit' : 'text-gray-200'}`}>{reward}</span>
            </div>
          </div>

          {/* Suggested setup */}
          {setup && (
            <div className="bg-surface-900 border border-surface-600 rounded-lg p-3 flex flex-col gap-2.5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Suggested setup ({rec.setup ? '25 DTE' : ''})</p>

              {/* Leg pills */}
              <div className="flex flex-wrap gap-1.5">
                {setup.legs.map((leg, i) => (
                  <LegBadge key={i} leg={leg} />
                ))}
              </div>

              {/* Description */}
              <p className="text-xs text-gray-400 font-mono leading-relaxed">{setup.description}</p>

              {/* Load button */}
              <button
                onClick={() => onTryIt(setup.simulatorLoad)}
                className="self-start text-xs px-3 py-1.5 rounded-lg bg-accent/20 text-accent border border-accent/40 hover:bg-accent/35 transition-all font-semibold"
              >
                ⚡ Load into Simulator →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── StrategyRecommendations ─────────────────────────────────────────────────

export default function StrategyRecommendations({ recommendations, signals, onTryIt }) {
  return (
    <div className="card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Strategy Recommendations</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Ranked by fit score (0–100) across IV environment, directional trend, and volatility level
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {signals.map((s) => (
            <SignalPill key={s.label} signal={s} />
          ))}
        </div>
      </div>

      {/* Scoring legend */}
      <div className="flex gap-4 text-[10px] text-gray-600 flex-wrap border-t border-surface-600 pt-3">
        <span><span className="text-profit font-bold">●</span> Score ≥ 75 = High confidence</span>
        <span><span className="text-amber-400 font-bold">●</span> Score 55–74 = Moderate</span>
        <span><span className="text-gray-400 font-bold">●</span> Score &lt; 55 = Low</span>
        <span className="ml-auto text-gray-600 italic">Hover signal pills for details · Click cards to expand</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.strategyId} rec={rec} onTryIt={onTryIt} />
        ))}
      </div>

      <p className="text-[10px] text-gray-700 italic">
        Recommendations are algorithmic and educational only. They do not constitute financial advice.
        Always assess your own risk tolerance, portfolio context, and consult a licensed advisor before trading.
      </p>
    </div>
  )
}
