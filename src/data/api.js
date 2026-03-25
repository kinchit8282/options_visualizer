/**
 * Client-side API layer
 *
 * Calls the Vite middleware endpoints (/api/market/chart & /api/market/options)
 * which run in Node.js and handle the Yahoo Finance session + crumb server-side.
 *
 * Graceful degradation:
 *   priceSource   'live'     – real Yahoo price + history
 *   optionsSource 'live'     – real Yahoo bid/ask/IV/OI
 *                 'computed' – Black-Scholes from historical vol (options unavailable)
 */

const BASE = '/api/market'
const R    = 0.053  // risk-free rate

// ─── Static stock metadata ────────────────────────────────────────────────────

export const STOCK_META = {
  NVDA: { name: 'NVIDIA Corp',       sector: 'Semiconductors', color: 'text-green-400',  description: 'High-IV AI/GPU leader. Elevated premiums make spreads and condors attractive.', skewSlope: 0.15, smileConvexity: 0.8, strikeStep: 5,  strikeRange: 0.22 },
  META: { name: 'Meta Platforms',    sector: 'Technology',     color: 'text-blue-400',   description: 'Moderate IV with steady uptrend. Good for covered calls and bull spreads.',       skewSlope: 0.12, smileConvexity: 0.6, strikeStep: 20, strikeRange: 0.20 },
  SPY:  { name: 'S&P 500 ETF',       sector: 'Index ETF',      color: 'text-purple-400', description: 'Low IV broad market index. Ideal for iron condors and short straddles.',           skewSlope: 0.25, smileConvexity: 0.5, strikeStep: 5,  strikeRange: 0.15 },
  AAPL: { name: 'Apple Inc.',         sector: 'Technology',     color: 'text-gray-300',   description: 'Large-cap tech with moderate IV. Covered calls and spreads are popular.',          skewSlope: 0.12, smileConvexity: 0.5, strikeStep: 5,  strikeRange: 0.20 },
  TSLA: { name: 'Tesla Inc.',         sector: 'Auto / EV',      color: 'text-red-400',    description: 'High-beta, high-IV name. Wide chains and large implied moves.',                    skewSlope: 0.18, smileConvexity: 0.9, strikeStep: 5,  strikeRange: 0.30 },
  MSFT: { name: 'Microsoft Corp.',    sector: 'Technology',     color: 'text-blue-300',   description: 'Steady large-cap. Moderate IV suits bull spreads and covered calls.',              skewSlope: 0.12, smileConvexity: 0.5, strikeStep: 10, strikeRange: 0.20 },
  AMZN: { name: 'Amazon.com Inc.',    sector: 'Consumer / Cloud',color:'text-amber-400',  description: 'High-volume options with moderate-to-high IV around earnings.',                    skewSlope: 0.14, smileConvexity: 0.6, strikeStep: 10, strikeRange: 0.22 },
  GOOGL:{ name: 'Alphabet Inc.',      sector: 'Technology',     color: 'text-green-300',  description: 'Moderate IV index-like behaviour. Iron condors work well.',                        skewSlope: 0.12, smileConvexity: 0.5, strikeStep: 10, strikeRange: 0.20 },
  QQQ:  { name: 'Nasdaq-100 ETF',     sector: 'Index ETF',      color: 'text-indigo-400', description: 'Tech-heavy index ETF. Low-to-moderate IV, liquid options.',                        skewSlope: 0.20, smileConvexity: 0.5, strikeStep: 5,  strikeRange: 0.18 },
  AMD:  { name: 'Adv. Micro Devices', sector: 'Semiconductors', color: 'text-orange-400', description: 'High-IV semiconductor name, often moves with NVDA.',                               skewSlope: 0.16, smileConvexity: 0.8, strikeStep: 5,  strikeRange: 0.25 },
}

// Reasonable BS parameters for any symbol not in the table above
function genericMeta(symbol, price = 100) {
  const step = price >= 500 ? 10 : price >= 100 ? 5 : price >= 20 ? 2.5 : 1
  return {
    name: symbol, sector: 'Equity', color: 'text-gray-300',
    description: `${symbol} live options chain and market data.`,
    skewSlope: 0.13, smileConvexity: 0.6, strikeStep: step, strikeRange: 0.22,
  }
}

function resolveMeta(symbol, price) {
  return STOCK_META[symbol] ?? genericMeta(symbol, price)
}

// ─── Black-Scholes ────────────────────────────────────────────────────────────

function normCDF(x) {
  const a = [0, 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + p * ax)
  const poly = t * (a[1] + t * (a[2] + t * (a[3] + t * (a[4] + t * a[5]))))
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-ax * ax)))
}
function normPDF(x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI) }
function bsD1(S, K, T, r, σ) { return (Math.log(S / K) + (r + σ * σ / 2) * T) / (σ * Math.sqrt(T)) }
function bsCall(S, K, T, r, σ) {
  if (T <= 0) return Math.max(0, S - K)
  const d1 = bsD1(S, K, T, r, σ); return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d1 - σ * Math.sqrt(T))
}
function bsPut(S, K, T, r, σ) { return bsCall(S, K, T, r, σ) - S + K * Math.exp(-r * T) }

export function callDelta(S, K, T, r, σ) { return T <= 0 ? (S > K ? 1 : 0) : normCDF(bsD1(S, K, T, r, σ)) }
export function putDelta(S, K, T, r, σ)  { return callDelta(S, K, T, r, σ) - 1 }
export function bsTheta(S, K, T, r, σ, isCall) {
  if (T <= 0) return 0
  const d1 = bsD1(S, K, T, r, σ), d2 = d1 - σ * Math.sqrt(T)
  const ct = (-(S * normPDF(d1) * σ) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCDF(d2)) / 365
  return isCall ? ct : ct + r * K * Math.exp(-r * T) / 365
}

function skewedIV(base, S, K, slope, convex) {
  const m = (K - S) / S
  return Math.max(0.05, base * (1 - slope * m + convex * m * m))
}

function realizedVol(closes) {
  if (closes.length < 2) return 0.25
  const lr = closes.slice(1).map((p, i) => Math.log(p / closes[i]))
  const mean = lr.reduce((a, b) => a + b) / lr.length
  return Math.sqrt(lr.reduce((a, b) => a + (b - mean) ** 2, 0) / (lr.length - 1) * 252)
}

function impliedMove(S, iv, dte) {
  const T = dte / 365
  return ((bsCall(S, S, T, R, iv) + bsPut(S, S, T, R, iv)) / S * 100).toFixed(1)
}

function fmtDate(unixTs) {
  return new Date(unixTs * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Parse chart response (yahoo-finance2 normalised format) ─────────────────

function parseChart(json) {
  if (json?.error) throw new Error(json.error)

  const { currentPrice, change = 0, changePercent = 0, history = [] } = json

  if (!currentPrice) throw new Error('Missing currentPrice in chart response')

  const prices = history
    .map((h) => h.close)
    .filter((p) => p != null && p > 0)
    .slice(-30)

  if (prices.length < 2) throw new Error('Insufficient price history')

  const rv   = realizedVol(prices)
  const high = Math.max(...prices)
  const low  = Math.min(...prices)
  const chg  = ((prices.at(-1) - prices[0]) / prices[0] * 100).toFixed(1)

  return {
    currentPrice,
    change,
    changePercent,
    priceHistory:   prices.map((p, i) => ({ day: i + 1, price: parseFloat(p.toFixed(2)) })),
    priceChartData: prices.map((p, i) => ({ day: i + 1, price: parseFloat(p.toFixed(2)) })),
    rv,
    stats: {
      change30d:   chg,
      high30:      high.toFixed(2),
      low30:       low.toFixed(2),
      realizedVol: (rv * 100).toFixed(1),
    },
  }
}

// ─── Parse Yahoo options response ─────────────────────────────────────────────

function parseChainRow(contract, S, T, isCall) {
  const K  = contract.strike
  const iv = Math.max(0.05, contract.impliedVolatility ?? 0.3)
  const bid = Math.max(0, contract.bid ?? 0)
  const ask = Math.max(bid + 0.01, contract.ask ?? bid + 0.05)
  const delta = isCall ? callDelta(S, K, T, R, iv) : putDelta(S, K, T, R, iv)
  const theta = bsTheta(S, K, T, R, iv, isCall)

  return {
    bid:    parseFloat(bid.toFixed(2)),
    ask:    parseFloat(ask.toFixed(2)),
    last:   parseFloat((contract.lastPrice ?? 0).toFixed(2)),
    delta:  parseFloat(delta.toFixed(3)),
    theta:  parseFloat(theta.toFixed(3)),
    iv:     parseFloat((iv * 100).toFixed(1)),
    oi:     contract.openInterest ?? 0,
    volume: contract.volume       ?? 0,
  }
}

function parseLiveChain(optionData, S, expirationTs) {
  const now = Date.now() / 1000
  const T   = Math.max(1 / 365, (expirationTs - now) / (365 * 86400))
  const map = {}

  for (const c of (optionData?.calls ?? [])) {
    const K = c.strike
    if (!map[K]) map[K] = { strike: K, callItm: c.inTheMoney ?? K < S, putItm: false }
    map[K].call = parseChainRow(c, S, T, true)
  }
  for (const p of (optionData?.puts ?? [])) {
    const K = p.strike
    if (!map[K]) map[K] = { strike: K, callItm: false, putItm: p.inTheMoney ?? K > S }
    map[K].put = parseChainRow(p, S, T, false)
    map[K].putItm = p.inTheMoney ?? K > S
  }

  return Object.values(map)
    .filter((r) => r.call && r.put)
    .sort((a, b) => a.strike - b.strike)
}

// ─── BS fallback chain ────────────────────────────────────────────────────────

function computeChain(meta, S, rv, exp) {
  const { strikeStep, strikeRange, skewSlope, smileConvexity } = meta
  const baseIV = rv * 1.15  // standard vol risk premium
  const now    = Date.now() / 1000
  const T      = Math.max(1 / 365, (exp.ts - now) / (365 * 86400))
  const low    = Math.floor(S * (1 - strikeRange) / strikeStep) * strikeStep
  const high   = Math.ceil (S * (1 + strikeRange) / strikeStep) * strikeStep
  const rows   = []

  for (let K = low; K <= high; K += strikeStep) {
    const iv    = skewedIV(baseIV, S, K, skewSlope, smileConvexity)
    const ivPut = skewedIV(baseIV, S, K, skewSlope * 1.1, smileConvexity)
    const cDel  = callDelta(S, K, T, R, iv)
    const pDel  = putDelta (S, K, T, R, iv)
    const cMid  = bsCall(S, K, T, R, iv)
    const pMid  = bsPut (S, K, T, R, iv)
    const cSprd = Math.max(0.01, cMid * (Math.abs(cDel) > 0.5 ? 0.02 : 0.06))
    const pSprd = Math.max(0.01, pMid * (Math.abs(pDel) > 0.5 ? 0.02 : 0.06))

    rows.push({
      strike: K, callItm: K < S, putItm: K > S,
      call: {
        bid: parseFloat((cMid - cSprd / 2).toFixed(2)),
        ask: parseFloat((cMid + cSprd / 2).toFixed(2)),
        last: parseFloat(cMid.toFixed(2)),
        delta: parseFloat(cDel.toFixed(3)),
        theta: parseFloat(bsTheta(S, K, T, R, iv, true).toFixed(3)),
        iv: parseFloat((iv * 100).toFixed(1)), oi: 0, volume: 0,
      },
      put: {
        bid: parseFloat((pMid - pSprd / 2).toFixed(2)),
        ask: parseFloat((pMid + pSprd / 2).toFixed(2)),
        last: parseFloat(pMid.toFixed(2)),
        delta: parseFloat(pDel.toFixed(3)),
        theta: parseFloat(bsTheta(S, K, T, R, iv, false).toFixed(3)),
        iv: parseFloat((ivPut * 100).toFixed(1)), oi: 0, volume: 0,
      },
    })
  }
  return rows
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function fetchAllStockData(symbol, force = false) {
  // ── 1. Real price + history (required) ────────────────────────────────────
  const chartRes = await fetch(`${BASE}/chart/${symbol}${force ? '?force=true' : ''}`)
  if (!chartRes.ok) {
    const err = await chartRes.json().catch(() => ({ error: chartRes.statusText }))
    throw new Error(err.error ?? `Chart failed: ${chartRes.status}`)
  }
  const chartJson = await chartRes.json()
  const chartData = parseChart(chartJson)
  const { currentPrice, rv } = chartData
  const meta = resolveMeta(symbol, currentPrice)

  // ── 2. Options chain (best-effort) ────────────────────────────────────────
  let optionsJson   = null   // { expirationDates: [unixTs], options: [{...}] }
  let optionsSource = 'computed'

  try {
    const optRes = await fetch(`${BASE}/options/${symbol}${force ? '?force=true' : ''}`)
    if (optRes.ok) {
      const j = await optRes.json()
      if (!j?.error && j?.expirationDates?.length) {
        optionsJson   = j
        optionsSource = 'live'
      }
    }
  } catch {
    /* options unavailable — fall back to BS */
  }

  // ── 3. Resolve expirations ─────────────────────────────────────────────────
  const now = Date.now() / 1000

  let expirationTimestamps
  if (optionsJson?.expirationDates?.length) {
    const dates = optionsJson.expirationDates
    const near  = dates.find((e) => (e - now) >= 3  * 86400) ?? dates[0]
    const far   = dates.find((e) => (e - now) >= 20 * 86400) ?? dates[Math.min(1, dates.length - 1)]
    expirationTimestamps = [near, far]
  } else {
    const d = new Date(); d.setHours(21, 0, 0, 0)
    const bump = (days) => { const n = new Date(d); n.setDate(n.getDate() + days); return Math.floor(n / 1000) }
    expirationTimestamps = [bump(12), bump(26)]
  }

  const expirations = expirationTimestamps.map((ts) => ({
    label: fmtDate(ts),
    dte:   Math.max(1, Math.round((ts - now) / 86400)),
    ts,
  }))

  // ── 4. Build chains ────────────────────────────────────────────────────────
  const chains = expirations.map((exp, idx) => {
    let strikes
    // Find the matching expiration in the live options data
    const liveExp = optionsSource === 'live'
      ? optionsJson.options?.find((o) => Math.abs(o.expirationDate - exp.ts) < 86400)
      : null

    if (liveExp) {
      strikes = parseLiveChain(liveExp, currentPrice, exp.ts)
    } else {
      strikes = computeChain(meta, currentPrice, rv, exp)
    }

    // ATM IV for implied move
    const atm    = strikes.reduce((b, r) => Math.abs(r.strike - currentPrice) < Math.abs(b.strike - currentPrice) ? r : b, strikes[0])
    const atmIV  = (atm?.call?.iv ?? rv * 115) / 100
    return { ...exp, strikes, impliedMove: impliedMove(currentPrice, atmIV, exp.dte) }
  })

  // ── 5. Aggregate IV stats ──────────────────────────────────────────────────
  const nearAtm   = chains[0]?.strikes?.reduce((b, r) =>
    Math.abs(r.strike - currentPrice) < Math.abs(b.strike - currentPrice) ? r : b,
    chains[0]?.strikes?.[0]
  )
  const impliedVol = parseFloat((nearAtm?.call?.iv ?? rv * 115).toFixed(1))
  const ivRv       = (impliedVol / parseFloat(chartData.stats.realizedVol)).toFixed(2)

  return {
    symbol,
    ...meta,
    currentPrice,
    expirations,
    chains,
    priceHistory:   chartData.priceHistory,
    priceChartData: chartData.priceChartData,
    baseIV:         impliedVol / 100,
    stats: {
      ...chartData.stats,
      impliedVol: impliedVol.toString(),
      ivRv,
    },
    // Source flags
    optionsSource,
    priceSource:  'live',
    lastUpdated:  new Date(),
  }
}
