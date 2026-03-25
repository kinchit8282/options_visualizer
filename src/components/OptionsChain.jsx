import React, { useState } from 'react'

// ─── Greek cell coloring ──────────────────────────────────────────────────────

function deltaColor(delta) {
  const abs = Math.abs(delta)
  if (abs >= 0.7) return 'text-white'
  if (abs >= 0.4) return 'text-gray-200'
  if (abs >= 0.2) return 'text-gray-400'
  return 'text-gray-600'
}

function ivColor(iv) {
  if (iv >= 70) return 'text-red-400'
  if (iv >= 50) return 'text-amber-400'
  if (iv >= 30) return 'text-yellow-300'
  return 'text-green-400'
}

function thetaColor(t) {
  // more negative theta = more red (closer to ATM)
  if (t <= -0.08) return 'text-red-400'
  if (t <= -0.04) return 'text-orange-400'
  if (t <= -0.02) return 'text-yellow-400'
  return 'text-gray-400'
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function ChainRow({ row, currentPrice, onLoadCall, onLoadPut }) {
  const { strike, call, put, callItm, putItm } = row
  const isAtm = Math.abs(strike - currentPrice) <= currentPrice * 0.01

  const rowBase = isAtm
    ? 'border-l-2 border-accent'
    : ''

  const callBg = callItm ? 'bg-profit/5' : ''
  const putBg = putItm ? 'bg-loss/5' : ''

  return (
    <tr className={`group border-b border-surface-600 hover:bg-surface-700/50 transition-colors text-xs ${rowBase}`}>
      {/* ── CALL side ── */}
      <td className={`px-2 py-2 text-right ${callBg} ${deltaColor(call.delta)}`}>{call.delta.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right ${callBg} ${ivColor(call.iv)}`}>{call.iv}%</td>
      <td className={`px-2 py-2 text-right ${callBg} ${thetaColor(call.theta)}`}>{call.theta.toFixed(3)}</td>
      <td className={`px-2 py-2 text-right ${callBg} text-gray-400`}>{call.bid.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right ${callBg} text-white font-medium`}>{call.ask.toFixed(2)}</td>
      <td className={`px-2 py-2 text-right ${callBg} text-gray-500`}>{call.oi.toLocaleString()}</td>
      <td className={`px-2 py-2 text-right ${callBg}`}>
        <button
          onClick={() => onLoadCall({ strike, premium: call.ask })}
          className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/30 hover:bg-accent/40 transition-all whitespace-nowrap"
        >
          Use ↗
        </button>
      </td>

      {/* ── STRIKE ── */}
      <td className={`px-3 py-2 text-center font-bold tabular-nums ${isAtm ? 'text-accent text-sm' : 'text-gray-300'}`}>
        {strike}
        {isAtm && <span className="ml-1 text-[9px] text-accent/70 font-normal">ATM</span>}
      </td>

      {/* ── PUT side ── */}
      <td className={`px-2 py-2 text-left ${putBg}`}>
        <button
          onClick={() => onLoadPut({ strike, premium: put.ask })}
          className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/30 hover:bg-accent/40 transition-all whitespace-nowrap"
        >
          Use ↗
        </button>
      </td>
      <td className={`px-2 py-2 text-left ${putBg} text-gray-400`}>{put.bid.toFixed(2)}</td>
      <td className={`px-2 py-2 text-left ${putBg} text-white font-medium`}>{put.ask.toFixed(2)}</td>
      <td className={`px-2 py-2 text-left ${putBg} ${ivColor(put.iv)}`}>{put.iv}%</td>
      <td className={`px-2 py-2 text-left ${putBg} ${thetaColor(put.theta)}`}>{put.theta.toFixed(3)}</td>
      <td className={`px-2 py-2 text-left ${putBg} ${deltaColor(put.delta)}`}>{put.delta.toFixed(2)}</td>
      <td className={`px-2 py-2 text-left ${putBg} text-gray-500`}>{put.oi.toLocaleString()}</td>
    </tr>
  )
}

// ─── OptionsChain ─────────────────────────────────────────────────────────────

export default function OptionsChain({ chain, currentPrice, onLoadCall, onLoadPut }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-surface-500">
            {/* CALLS header */}
            <th colSpan={7} className="py-2 text-center text-profit text-[11px] font-semibold tracking-wider border-r border-surface-600">
              CALLS
            </th>
            {/* STRIKE */}
            <th className="py-2 px-3 text-center text-gray-400 text-[11px] tracking-wider">STRIKE</th>
            {/* PUTS header */}
            <th colSpan={7} className="py-2 text-center text-loss text-[11px] font-semibold tracking-wider border-l border-surface-600">
              PUTS
            </th>
          </tr>
          <tr className="border-b border-surface-600 text-gray-500 text-[10px] uppercase tracking-wide">
            {/* Call cols */}
            <th className="px-2 py-1.5 text-right">Δ Delta</th>
            <th className="px-2 py-1.5 text-right">IV</th>
            <th className="px-2 py-1.5 text-right">Θ Theta</th>
            <th className="px-2 py-1.5 text-right">Bid</th>
            <th className="px-2 py-1.5 text-right">Ask</th>
            <th className="px-2 py-1.5 text-right">OI</th>
            <th className="px-2 py-1.5 text-right w-16"></th>
            {/* Strike */}
            <th className="px-3 py-1.5 text-center"></th>
            {/* Put cols */}
            <th className="px-2 py-1.5 text-left w-16"></th>
            <th className="px-2 py-1.5 text-left">Bid</th>
            <th className="px-2 py-1.5 text-left">Ask</th>
            <th className="px-2 py-1.5 text-left">IV</th>
            <th className="px-2 py-1.5 text-left">Θ Theta</th>
            <th className="px-2 py-1.5 text-left">Δ Delta</th>
            <th className="px-2 py-1.5 text-left">OI</th>
          </tr>
        </thead>
        <tbody>
          {chain.strikes.map((row) => (
            <ChainRow
              key={row.strike}
              row={row}
              currentPrice={currentPrice}
              onLoadCall={onLoadCall}
              onLoadPut={onLoadPut}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
