import React, { useState, useMemo, useEffect, useRef } from 'react'
import { STOCK_META } from '../data/api.js'
import { getRecommendations } from '../data/recommendations.js'
import { useMarketData } from '../hooks/useMarketData.js'
import PriceHistoryChart from '../components/PriceHistoryChart.jsx'
import OptionsChain from '../components/OptionsChain.jsx'
import StrategyRecommendations from '../components/StrategyRecommendations.jsx'
import StrategyComparisonTable from '../components/StrategyComparisonTable.jsx'

// Popular symbols always shown as quick-select chips
const POPULAR = ['NVDA', 'META', 'SPY', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'QQQ', 'AMD']
const RECENT_KEY = 'options-viz-recent'
const MAX_RECENT = 8

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(sym) {
  const prev = loadRecent().filter((s) => s !== sym)
  const next = [sym, ...prev].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  return next
}

// ─── Data-source badge ────────────────────────────────────────────────────────

function SourceBadge({ priceSource, optionsSource, loading }) {
  if (loading) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-gray-500 border border-surface-500 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse" />
        Fetching live data…
      </span>
    )
  }
  if (priceSource === 'live' && optionsSource === 'live') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-profit font-semibold border border-profit/30 bg-profit/10 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
        LIVE — Real price &amp; options
      </span>
    )
  }
  if (priceSource === 'live') {
    return (
      <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold border border-amber-400/30 bg-amber-400/10 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        LIVE PRICE · Options computed from historical vol
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-gray-400 border border-surface-500 rounded-full px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
      SIMULATED — Static data (Feb–Mar 2026)
    </span>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`bg-surface-600 animate-pulse rounded ${className}`} />
}

function StockOverviewSkeleton() {
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
      <Skeleton className="h-28 w-full" />
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }) {
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-base font-bold tabular-nums ${color ?? 'text-white'}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-600">{sub}</span>}
    </div>
  )
}

// ─── IV/RV badge ──────────────────────────────────────────────────────────────

function IVRVBadge({ ivRv }) {
  const n = parseFloat(ivRv)
  const isRich = n >= 1.2
  const isCheap = n <= 0.9
  const cls = isRich   ? 'text-red-400 bg-red-400/10 border-red-400/30'
    : isCheap ? 'text-green-400 bg-green-400/10 border-green-400/30'
              : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
  const label = isRich ? 'IV Rich' : isCheap ? 'IV Cheap' : 'IV Fair'
  return (
    <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${cls}`}>
      {label} ({ivRv}x)
    </span>
  )
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ msg, onDismiss }) {
  if (!msg) return null
  return (
    <div className="fixed bottom-6 right-6 bg-accent text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 z-50">
      <span>✓ {msg}</span>
      <button onClick={onDismiss} className="text-white/60 hover:text-white leading-none">×</button>
    </div>
  )
}

// ─── Symbol search bar ────────────────────────────────────────────────────────

function SymbolSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  function submit(e) {
    e.preventDefault()
    const sym = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (sym.length >= 1 && sym.length <= 10) {
      onSelect(sym)
      setQuery('')
    }
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none pointer-events-none">
          $
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, ''))}
          placeholder="Search ticker…"
          maxLength={10}
          className="bg-surface-700 border border-surface-500 rounded-lg pl-6 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/60 w-36 transition-all focus:w-44"
        />
      </div>
      <button
        type="submit"
        disabled={!query.trim()}
        className="text-xs px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-accent font-semibold hover:bg-accent/30 disabled:opacity-30 transition-all"
      >
        Load
      </button>
    </form>
  )
}

// ─── MarketData page ──────────────────────────────────────────────────────────

export default function MarketData({ onLoadIntoSimulator }) {
  const [activeSymbol, setActiveSymbol] = useState('NVDA')
  const [activeExpIdx, setActiveExpIdx] = useState(0)
  const [toast, setToast]               = useState(null)
  const [recent, setRecent]             = useState(loadRecent)

  const { data: stock, loading, error, refresh, lastUpdated, priceSource, optionsSource } =
    useMarketData(activeSymbol)

  const chain = stock?.chains?.[activeExpIdx]

  const { recommendations, signals } = useMemo(
    () => (stock ? getRecommendations(stock, 3) : { recommendations: [], signals: [] }),
    [stock, activeSymbol]
  )

  const isUp = parseFloat(stock?.stats?.change30d ?? '0') >= 0

  function notify(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleSymbolChange(sym) {
    setActiveSymbol(sym)
    setActiveExpIdx(0)
    setRecent(saveRecent(sym))
  }

  function handleLoadFromRec(simulatorLoad) {
    onLoadIntoSimulator(simulatorLoad)
    notify(`${simulatorLoad.strategyId} loaded into Simulator →`)
  }

  function handleLoadCall({ strike, premium }) {
    onLoadIntoSimulator({
      strategyId: 'longCall',
      overrides: { stockPrice: stock.currentPrice, strike, premium },
    })
    notify(`Long Call loaded — K=$${strike}, Premium=$${premium.toFixed(2)}`)
  }

  function handleLoadPut({ strike, premium }) {
    onLoadIntoSimulator({
      strategyId: 'longPut',
      overrides: { stockPrice: stock.currentPrice, strike, premium },
    })
    notify(`Long Put loaded — K=$${strike}, Premium=$${premium.toFixed(2)}`)
  }

  // Recent symbols that are NOT already in POPULAR (to avoid duplicating chips)
  const recentExtra = recent.filter((s) => !POPULAR.includes(s))

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Market Data</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real prices via Yahoo Finance · Options use live IV when available, Black-Scholes otherwise
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge priceSource={priceSource} optionsSource={optionsSource} loading={loading} />

          {lastUpdated && (
            <span className="text-[10px] text-gray-600">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={refresh}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-surface-500 text-gray-400 hover:text-gray-200 hover:border-surface-400 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <span className={loading ? 'animate-spin' : ''}>↻</span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg px-4 py-2.5 text-xs text-amber-400 flex items-center gap-2">
          <span>⚠</span>
          <span>{error} — showing {priceSource === 'live' ? 'live price with computed options' : 'static simulated data'}.</span>
        </div>
      )}

      {/* ── Symbol picker ── */}
      <div className="flex flex-col gap-2">
        {/* Search bar row */}
        <div className="flex items-center gap-3 flex-wrap">
          <SymbolSearch onSelect={handleSymbolChange} />
          {activeSymbol && !POPULAR.includes(activeSymbol) && (
            <span className="text-xs text-gray-500">
              Viewing: <span className="text-white font-semibold">{activeSymbol}</span>
            </span>
          )}
        </div>

        {/* Popular chips */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider self-center mr-1">Popular</span>
          {POPULAR.map((sym) => {
            const meta = STOCK_META[sym]
            return (
              <button
                key={sym}
                onClick={() => handleSymbolChange(sym)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  sym === activeSymbol
                    ? 'bg-surface-700 border-accent/50 text-white font-semibold'
                    : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500 hover:text-gray-200'
                }`}
              >
                <span className="font-bold">{sym}</span>
                <span className={`hidden sm:block text-[10px] ${sym === activeSymbol ? 'text-gray-400' : 'text-gray-600'}`}>
                  {meta?.name ?? ''}
                </span>
              </button>
            )
          })}
        </div>

        {/* Recent non-popular symbols */}
        {recentExtra.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider mr-1">Recent</span>
            {recentExtra.map((sym) => (
              <button
                key={sym}
                onClick={() => handleSymbolChange(sym)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                  sym === activeSymbol
                    ? 'bg-surface-700 border-accent/50 text-white font-semibold'
                    : 'bg-surface-800 border-surface-600 text-gray-400 hover:border-surface-500 hover:text-gray-200'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Stock overview ── */}
      {loading && !stock ? (
        <StockOverviewSkeleton />
      ) : stock ? (
        <div className="card flex flex-col gap-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`text-3xl font-bold tabular-nums ${loading ? 'text-gray-400' : 'text-white'}`}>
                  ${stock.currentPrice.toFixed(2)}
                </span>
                {!loading && (
                  <span className={`text-base font-semibold ${isUp ? 'text-profit' : 'text-loss'}`}>
                    {isUp ? '▲' : '▼'} {Math.abs(stock.stats.change30d)}% (30d)
                  </span>
                )}
                {loading && <span className="text-xs text-gray-600 animate-pulse">updating…</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{stock.name} · {stock.sector}</p>
              <p className="text-xs text-gray-600 mt-1 max-w-md">{stock.description}</p>
            </div>
            <IVRVBadge ivRv={stock.stats.ivRv} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat label="30d High"  value={`$${stock.stats.high30}`} />
            <Stat label="30d Low"   value={`$${stock.stats.low30}`}  />
            <Stat label="Implied Vol"   value={`${stock.stats.impliedVol}%`}  color="text-amber-400" />
            <Stat label="Realized Vol"  value={`${stock.stats.realizedVol}%`} color="text-blue-400"  sub="30d ann." />
            {chain && (
              <Stat
                label={`Implied Move (${chain.dte}d)`}
                value={`±${chain.impliedMove}%`}
                color="text-violet-400"
                sub="ATM straddle"
              />
            )}
          </div>

          {/* 30-day chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">
                30-Day Price History
              </p>
              {priceSource === 'live' && (
                <span className="text-[10px] text-profit">● Real Yahoo Finance data</span>
              )}
              {priceSource === 'static' && (
                <span className="text-[10px] text-gray-600">● Simulated (Feb–Mar 2026)</span>
              )}
            </div>
            <PriceHistoryChart
              data={stock.priceChartData}
              currentPrice={stock.currentPrice}
            />
          </div>
        </div>
      ) : null}

      {/* ── Recommendations ── */}
      {!loading && recommendations.length > 0 && (
        <StrategyRecommendations
          recommendations={recommendations}
          signals={signals}
          onTryIt={handleLoadFromRec}
        />
      )}
      {loading && recommendations.length === 0 && (
        <div className="card">
          <Skeleton className="h-6 w-48 mb-3" />
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        </div>
      )}

      {/* ── Strategy comparison table ── */}
      {!loading && stock && (
        <StrategyComparisonTable
          stockData={stock}
          onLoadIntoSimulator={handleLoadFromRec}
        />
      )}

      {/* ── Options chain ── */}
      {stock && chain && (
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-300">Options Chain</h3>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {optionsSource === 'live'
                  ? 'Live bid/ask · Greeks computed analytically from Yahoo IV'
                  : 'Theoretical pricing via Black-Scholes · IV estimated from historical vol × 1.15'}
              </p>
            </div>

            {/* Expiration tabs */}
            <div className="flex gap-2">
              {stock.expirations.map((exp, i) => (
                <button
                  key={i}
                  onClick={() => setActiveExpIdx(i)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    i === activeExpIdx
                      ? 'bg-accent/20 border-accent/50 text-accent font-semibold'
                      : 'bg-surface-700 border-surface-500 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {exp.label}
                  <span className="ml-1.5 text-[10px] opacity-60">{exp.dte}d</span>
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-[10px] text-gray-600 flex-wrap">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-profit/20 mr-1" />ITM calls</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-loss/20 mr-1" />ITM puts</span>
            <span className="text-accent">Hover any row → "Use ↗" loads into Simulator</span>
            {optionsSource === 'live' && activeExpIdx === 0 && (
              <span className="text-profit ml-auto">● Near expiry: live Yahoo data</span>
            )}
          </div>

          <OptionsChain
            chain={chain}
            currentPrice={stock.currentPrice}
            onLoadCall={handleLoadCall}
            onLoadPut={handleLoadPut}
          />
        </div>
      )}

      <Toast msg={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
