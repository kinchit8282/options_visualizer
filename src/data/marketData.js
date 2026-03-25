// ─── Black-Scholes Engine ─────────────────────────────────────────────────────

/** Abramowitz & Stegun approximation of standard normal CDF — max error 7.5e-8 */
function normCDF(x) {
  const a = [0.0, 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x) / Math.SQRT2
  const t = 1.0 / (1.0 + p * ax)
  const poly = t * (a[1] + t * (a[2] + t * (a[3] + t * (a[4] + t * a[5]))))
  const y = 1.0 - poly * Math.exp(-ax * ax)
  return 0.5 * (1.0 + sign * y)
}

function normPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

function bsD1(S, K, T, r, sigma) {
  return (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T))
}

function bsCall(S, K, T, r, sigma) {
  if (T <= 0) return Math.max(0, S - K)
  const d1 = bsD1(S, K, T, r, sigma)
  const d2 = d1 - sigma * Math.sqrt(T)
  return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2)
}

function bsPut(S, K, T, r, sigma) {
  if (T <= 0) return Math.max(0, K - S)
  // Put-call parity
  return bsCall(S, K, T, r, sigma) - S + K * Math.exp(-r * T)
}

function callDelta(S, K, T, r, sigma) {
  if (T <= 0) return S > K ? 1 : 0
  return normCDF(bsD1(S, K, T, r, sigma))
}

function putDelta(S, K, T, r, sigma) {
  return callDelta(S, K, T, r, sigma) - 1
}

function theta(S, K, T, r, sigma, isCall) {
  // Per-day theta (not annualised)
  if (T <= 0) return 0
  const d1 = bsD1(S, K, T, r, sigma)
  const d2 = d1 - sigma * Math.sqrt(T)
  const term1 = -(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T))
  const callTheta = (term1 - r * K * Math.exp(-r * T) * normCDF(d2)) / 365
  return isCall ? callTheta : (callTheta + r * K * Math.exp(-r * T) / 365)
}

/** IV skew: higher IV for OTM puts (negative skew) + convexity smile */
function skewedIV(baseIV, S, K, skewSlope, smileConvexity) {
  const m = (K - S) / S // moneyness, negative = OTM put
  return Math.max(0.05, baseIV * (1 - skewSlope * m + smileConvexity * m * m))
}

/** Synthetic bid/ask spread: wider for OTM, deeper for low delta */
function bidAsk(mid, delta) {
  const absDelta = Math.abs(delta)
  const spreadFactor = absDelta > 0.5 ? 0.02 : absDelta > 0.2 ? 0.05 : 0.10
  const spread = Math.max(0.01, mid * spreadFactor)
  return {
    bid: parseFloat((mid - spread / 2).toFixed(2)),
    ask: parseFloat((mid + spread / 2).toFixed(2)),
  }
}

/** Deterministic pseudo-random (LCG) for reproducible OI/volume */
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(1664525, s) + 1013904223
    return (s >>> 0) / 0x100000000
  }
}

// ─── Stock Configs ────────────────────────────────────────────────────────────

const RISK_FREE = 0.053 // ~5.3% current Fed rate

export const SYMBOLS = ['NVDA', 'META', 'SPY']

const STOCK_CONFIGS = {
  NVDA: {
    name: 'NVIDIA Corp',
    sector: 'Semiconductors',
    currentPrice: 145.5,
    baseIV: 0.58,        // 58% IV — high volatility AI name
    skewSlope: 0.15,     // puts moderately more expensive
    smileConvexity: 0.8,
    strikeStep: 5,
    strikeRange: 0.22,   // ±22%
    // 30-day daily closes (Feb 22 → Mar 23, 2026), synthetic but plausible GBM path
    priceHistory: [
      128.4, 131.2, 129.8, 134.1, 136.7, 133.5, 130.2, 132.8, 135.9, 138.4,
      136.1, 139.7, 141.2, 138.8, 136.5, 140.3, 143.6, 141.9, 144.2, 142.7,
      145.1, 147.8, 144.4, 146.2, 148.5, 143.1, 141.7, 143.9, 146.8, 145.5,
    ],
    expirations: [
      { label: 'Apr 4, 2026', dte: 12 },
      { label: 'Apr 17, 2026', dte: 25 },
    ],
    description: 'High-IV AI/semiconductor leader. Elevated premiums make spreads attractive.',
    color: 'text-green-400',
  },
  META: {
    name: 'Meta Platforms',
    sector: 'Technology',
    currentPrice: 612.0,
    baseIV: 0.38,        // 38% IV
    skewSlope: 0.12,
    smileConvexity: 0.6,
    strikeStep: 20,
    strikeRange: 0.20,
    priceHistory: [
      577.2, 583.1, 580.4, 588.9, 592.3, 586.7, 591.4, 595.8, 598.2, 594.6,
      600.1, 597.3, 603.7, 608.2, 605.9, 609.4, 606.8, 611.2, 615.7, 612.3,
      608.9, 614.5, 618.2, 615.6, 610.3, 607.8, 613.1, 617.4, 614.9, 612.0,
    ],
    expirations: [
      { label: 'Apr 4, 2026', dte: 12 },
      { label: 'Apr 17, 2026', dte: 25 },
    ],
    description: 'Moderate IV with steady uptrend. Good for covered calls and bull spreads.',
    color: 'text-blue-400',
  },
  SPY: {
    name: 'S&P 500 ETF',
    sector: 'Index ETF',
    currentPrice: 572.0,
    baseIV: 0.17,        // 17% VIX environment
    skewSlope: 0.25,     // strong put skew (fear index effect)
    smileConvexity: 0.5,
    strikeStep: 5,
    strikeRange: 0.15,
    priceHistory: [
      553.4, 555.1, 554.2, 557.8, 560.3, 558.1, 561.4, 563.7, 562.2, 564.8,
      566.1, 564.9, 567.3, 569.8, 568.4, 571.2, 569.7, 572.4, 574.1, 572.8,
      570.3, 573.6, 575.2, 573.1, 571.4, 574.7, 576.3, 573.9, 572.5, 572.0,
    ],
    expirations: [
      { label: 'Apr 4, 2026', dte: 12 },
      { label: 'Apr 17, 2026', dte: 25 },
    ],
    description: 'Low IV broad market index. Ideal for iron condors and short straddles.',
    color: 'text-purple-400',
  },
}

// ─── Chain Generator ──────────────────────────────────────────────────────────

function generateChain(config, expiration) {
  const { currentPrice: S, baseIV, skewSlope, smileConvexity, strikeStep, strikeRange } = config
  const T = expiration.dte / 365
  const r = RISK_FREE

  const low = Math.floor(S * (1 - strikeRange) / strikeStep) * strikeStep
  const high = Math.ceil(S * (1 + strikeRange) / strikeStep) * strikeStep

  const rand = lcg(Math.round(S * 100 + expiration.dte * 7))
  const strikes = []

  for (let K = low; K <= high; K += strikeStep) {
    const iv = skewedIV(baseIV, S, K, skewSlope, smileConvexity)

    const callMid = bsCall(S, K, T, r, iv)
    const putMid = bsPut(S, K, T, r, iv)
    const cDelta = callDelta(S, K, T, r, iv)
    const pDelta = putDelta(S, K, T, r, iv)
    const cTheta = theta(S, K, T, r, iv, true)
    const pTheta = theta(S, K, T, r, iv, false)

    const cBidAsk = bidAsk(callMid, cDelta)
    const pBidAsk = bidAsk(putMid, pDelta)

    // Synthetic OI — peaks at ATM, round numbers get bonus
    const moneyness = Math.abs((K - S) / S)
    const baseOI = 5000 * Math.exp(-8 * moneyness * moneyness)
    const roundBonus = K % (strikeStep * 2) === 0 ? 1.6 : 1.0
    const oi = Math.round(baseOI * roundBonus * (0.7 + rand() * 0.6))
    const vol = Math.round(oi * (0.1 + rand() * 0.3))

    strikes.push({
      strike: K,
      itm: K < S, // used for call ITM highlight
      callItm: K < S,
      putItm: K > S,
      call: {
        bid: cBidAsk.bid,
        ask: cBidAsk.ask,
        last: parseFloat(callMid.toFixed(2)),
        delta: parseFloat(cDelta.toFixed(3)),
        theta: parseFloat(cTheta.toFixed(3)),
        iv: parseFloat((iv * 100).toFixed(1)),
        oi,
        volume: vol,
      },
      put: {
        bid: pBidAsk.bid,
        ask: pBidAsk.ask,
        last: parseFloat(putMid.toFixed(2)),
        delta: parseFloat(pDelta.toFixed(3)),
        theta: parseFloat(pTheta.toFixed(3)),
        iv: parseFloat((skewedIV(baseIV, S, K, skewSlope * 1.1, smileConvexity) * 100).toFixed(1)),
        oi,
        volume: vol,
      },
    })
  }
  return strikes
}

// ─── Implied Move ─────────────────────────────────────────────────────────────
/** ATM straddle price as % of stock price — shows market's expected move */
function impliedMove(config, dte) {
  const { currentPrice: S, baseIV } = config
  const T = dte / 365
  // ATM call + ATM put ≈ 2 * ATM call (put ≈ call for ATM)
  const atmCall = bsCall(S, S, T, RISK_FREE, baseIV)
  const atmPut = bsPut(S, S, T, RISK_FREE, baseIV)
  return ((atmCall + atmPut) / S * 100).toFixed(1)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getStockData(symbol) {
  const config = STOCK_CONFIGS[symbol]
  if (!config) return null

  const chains = config.expirations.map((exp) => ({
    ...exp,
    strikes: generateChain(config, exp),
    impliedMove: impliedMove(config, exp.dte),
  }))

  // 30-day stats
  const hist = config.priceHistory
  const change30d = ((hist[hist.length - 1] - hist[0]) / hist[0] * 100).toFixed(1)
  const high30 = Math.max(...hist).toFixed(2)
  const low30 = Math.min(...hist).toFixed(2)
  const realizedVol = (() => {
    const logReturns = hist.slice(1).map((p, i) => Math.log(p / hist[i]))
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
    const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / (logReturns.length - 1)
    return (Math.sqrt(variance * 252) * 100).toFixed(1) // annualised
  })()

  return {
    symbol,
    ...config,
    chains,
    stats: {
      change30d,
      high30,
      low30,
      realizedVol,
      impliedVol: (config.baseIV * 100).toFixed(1),
      ivRv: ((config.baseIV * 100) / parseFloat(realizedVol)).toFixed(2),
    },
    // 30-day chart data for Recharts
    priceChartData: hist.map((price, i) => ({
      day: i + 1,
      price,
      label: `Day ${i + 1}`,
    })),
  }
}

export const allStocksData = Object.fromEntries(SYMBOLS.map((s) => [s, getStockData(s)]))
