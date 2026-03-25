import React from 'react'

function SliderInput({ paramDef, value, onChange }) {
  const { key, label, step } = paramDef

  // Dynamic bounds so expensive stocks (NVDA $850, META $500) don't get clamped.
  // Always provide at least 30% headroom above and 30% below the current value,
  // falling back to the static min/max for cheap/default symbols.
  const dynMin = Math.min(paramDef.min, value * 0.7)
  const dynMax = Math.max(paramDef.max, value * 1.3)
  const pct = dynMax > dynMin ? ((value - dynMin) / (dynMax - dynMin)) * 100 : 50

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-medium text-gray-400">{label}</label>
        <span className="text-sm font-bold text-white tabular-nums">${value.toFixed(2)}</span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={dynMin}
          max={dynMax}
          step={step}
          value={value}
          onChange={(e) => onChange(key, parseFloat(e.target.value))}
          className="slider w-full"
          style={{ '--value': `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-600">
        <span>${dynMin.toFixed(0)}</span>
        <span>${dynMax.toFixed(0)}</span>
      </div>
    </div>
  )
}

export default function InputControls({ strategy, params, onChange }) {
  return (
    <div className="card flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Parameters</h3>
      {strategy.params.map((paramDef) => (
        <SliderInput
          key={paramDef.key}
          paramDef={paramDef}
          value={params[paramDef.key] ?? paramDef.default}
          onChange={onChange}
        />
      ))}
    </div>
  )
}
