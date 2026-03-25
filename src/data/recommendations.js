import { strategiesById } from '../strategies/index.js'

/**
 * Strategy Recommendation Engine
 *
 * Scores each strategy 0–100 based on three market signals derived from
 * the stock's options chain data.
 *
 *
 *  1. IV/RV ratio   — are options cheap or expensive vs recent realised vol?
 *  2. 30d trend     — what is the directional bias?
 *  3. IV level      — what is the absolute implied volatility environment?
 *
 * Higher score = better fit. Returns top N recommendations with rationale
 * and specific strike suggestions from the actual generated chain.
 */

// ─── Helper: find strike closest to a target delta ───────────────────────────

function findByDelta(strikes, targetDelta, isCall) {
  return strikes.reduce((best, s) => {
    const d = isCall ? s.call.delta : Math.abs(s.put.delta)
    const bd = isCall ? best.call.delta : Math.abs(best.put.delta)
    return Math.abs(d - targetDelta) < Math.abs(bd - targetDelta) ? s : best
  })
}

function findByStrikeClosest(strikes, targetStrike) {
  return strikes.reduce((best, s) =>
    Math.abs(s.strike - targetStrike) < Math.abs(best.strike - targetStrike) ? s : best
  )
}

// ─── Build suggested setups from live chain data ─────────────────────────────

function suggestIronCondor(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const shortPut  = findByDelta(strikes, 0.25, false)
  const longPut   = findByDelta(strikes, 0.10, false)
  const shortCall = findByDelta(strikes, 0.25, true)
  const longCall  = findByDelta(strikes, 0.10, true)
  const netCredit = (
    shortPut.put.ask + shortCall.call.ask - longPut.put.ask - longCall.call.ask
  ).toFixed(2)
  return {
    description:
      `Buy $${longPut.strike}P / Sell $${shortPut.strike}P  ·  Sell $${shortCall.strike}C / Buy $${longCall.strike}C — Net credit ≈ $${netCredit}`,
    legs: [
      { label: 'Buy Put',  strike: longPut.strike,  premium: longPut.put.ask,    type: 'longPut'  },
      { label: 'Sell Put', strike: shortPut.strike, premium: shortPut.put.bid,   type: 'shortPut' },
      { label: 'Sell Call',strike: shortCall.strike,premium: shortCall.call.bid, type: 'shortCall'},
      { label: 'Buy Call', strike: longCall.strike, premium: longCall.call.ask,  type: 'longCall' },
    ],
    simulatorLoad: {
      strategyId: 'ironCondor',
      overrides: {
        stockPrice:       S,
        buyPutStrike:     longPut.strike,
        buyPutPremium:    longPut.put.ask,
        sellPutStrike:    shortPut.strike,
        sellPutPremium:   shortPut.put.bid,
        sellCallStrike:   shortCall.strike,
        sellCallPremium:  shortCall.call.bid,
        buyCallStrike:    longCall.strike,
        buyCallPremium:   longCall.call.ask,
      },
    },
  }
}

function suggestBullCallSpread(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const longCall  = findByDelta(strikes, 0.50, true)   // ~ATM
  const shortCall = findByDelta(strikes, 0.25, true)   // OTM
  const netDebit  = (longCall.call.ask - shortCall.call.bid).toFixed(2)
  const maxProfit = (shortCall.strike - longCall.strike - parseFloat(netDebit)).toFixed(2)
  return {
    description:
      `Buy $${longCall.strike}C / Sell $${shortCall.strike}C — Net debit ≈ $${netDebit} · Max profit ≈ $${maxProfit}`,
    legs: [
      { label: 'Buy Call',  strike: longCall.strike,  premium: longCall.call.ask,  type: 'longCall'  },
      { label: 'Sell Call', strike: shortCall.strike, premium: shortCall.call.bid, type: 'shortCall' },
    ],
    simulatorLoad: {
      strategyId: 'bullCallSpread',
      overrides: {
        stockPrice: S,
        strike1:    longCall.strike,
        premium1:   longCall.call.ask,
        strike2:    shortCall.strike,
        premium2:   shortCall.call.bid,
      },
    },
  }
}

function suggestBearPutSpread(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const longPut  = findByDelta(strikes, 0.50, false)   // ~ATM
  const shortPut = findByDelta(strikes, 0.25, false)   // OTM
  const netDebit = (longPut.put.ask - shortPut.put.bid).toFixed(2)
  const maxProfit = (longPut.strike - shortPut.strike - parseFloat(netDebit)).toFixed(2)
  return {
    description:
      `Buy $${longPut.strike}P / Sell $${shortPut.strike}P — Net debit ≈ $${netDebit} · Max profit ≈ $${maxProfit}`,
    legs: [
      { label: 'Buy Put',  strike: longPut.strike,  premium: longPut.put.ask,  type: 'longPut'  },
      { label: 'Sell Put', strike: shortPut.strike, premium: shortPut.put.bid, type: 'shortPut' },
    ],
    simulatorLoad: {
      strategyId: 'bearPutSpread',
      overrides: {
        stockPrice: S,
        strike2:    longPut.strike,
        premium2:   longPut.put.ask,
        strike1:    shortPut.strike,
        premium1:   shortPut.put.bid,
      },
    },
  }
}

function suggestLongCall(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const row = findByDelta(strikes, 0.40, true)  // slightly OTM call
  return {
    description:
      `Buy $${row.strike}C — Ask $${row.call.ask.toFixed(2)} · Delta ${row.call.delta.toFixed(2)} · IV ${row.call.iv}%`,
    legs: [{ label: 'Buy Call', strike: row.strike, premium: row.call.ask, type: 'longCall' }],
    simulatorLoad: {
      strategyId: 'longCall',
      overrides: { stockPrice: S, strike: row.strike, premium: row.call.ask },
    },
  }
}

function suggestLongPut(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const row = findByDelta(strikes, 0.40, false)  // slightly OTM put
  return {
    description:
      `Buy $${row.strike}P — Ask $${row.put.ask.toFixed(2)} · Delta ${row.put.delta.toFixed(2)} · IV ${row.put.iv}%`,
    legs: [{ label: 'Buy Put', strike: row.strike, premium: row.put.ask, type: 'longPut' }],
    simulatorLoad: {
      strategyId: 'longPut',
      overrides: { stockPrice: S, strike: row.strike, premium: row.put.ask },
    },
  }
}

function suggestLongStraddle(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const atmCall = findByDelta(strikes, 0.50, true)
  const atmPut  = findByDelta(strikes, 0.50, false)
  const totalDebit = (atmCall.call.ask + atmPut.put.ask).toFixed(2)
  return {
    description:
      `Buy $${atmCall.strike}C + $${atmPut.strike}P — Total debit ≈ $${totalDebit} · Needs ±${((parseFloat(totalDebit)/S)*100).toFixed(1)}% move to profit`,
    legs: [
      { label: 'Buy Call', strike: atmCall.strike, premium: atmCall.call.ask, type: 'longCall' },
      { label: 'Buy Put',  strike: atmPut.strike,  premium: atmPut.put.ask,  type: 'longPut'  },
    ],
    simulatorLoad: {
      strategyId: 'longStraddle',
      overrides: {
        stockPrice:   S,
        strike:       atmCall.strike,
        callPremium:  atmCall.call.ask,
        putPremium:   atmPut.put.ask,
      },
    },
  }
}

function suggestCoveredCall(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const shortCall = findByDelta(strikes, 0.25, true)  // ~25 delta OTM call
  return {
    description:
      `Own 100 shares @ $${S} · Sell $${shortCall.strike}C for $${shortCall.call.bid.toFixed(2)} credit · Capped upside at $${shortCall.strike}`,
    legs: [{ label: 'Sell Call', strike: shortCall.strike, premium: shortCall.call.bid, type: 'shortCall' }],
    simulatorLoad: {
      strategyId: 'coveredCall',
      overrides: { stockPrice: S, strike: shortCall.strike, premium: shortCall.call.bid },
    },
  }
}

// ─── Scoring Engine ───────────────────────────────────────────────────────────

/**
 * Each strategy is scored 0–100 using three signal components:
 *  ivEnv  — is IV cheap (buy) or rich (sell)?
 *  trend  — directional bias
 *  ivAbs  — absolute volatility level
 *
 * Scores are combined with weights specific to each strategy.
 */
function scoreStrategies(stockData) {
  const { stats, priceHistory, currentPrice } = stockData
  const ivRv    = parseFloat(stats.ivRv)
  const trend   = parseFloat(stats.change30d)     // % over 30 days
  const iv      = parseFloat(stats.impliedVol)    // e.g. 58

  // ── Signal strengths (0–1) ──────────────────────────────────────────────────

  // How "IV-rich" is it? (selling premium favoured when > 1)
  const ivRichness = Math.min(1, Math.max(0, (ivRv - 0.8) / 0.8))   // 0 @ ivRv=0.8, 1 @ ivRv=1.6+
  const ivCheapness = 1 - ivRichness

  // Directional signals
  const bullStrength = Math.min(1, Math.max(0,  trend / 8))   // 1 at +8%
  const bearStrength = Math.min(1, Math.max(0, -trend / 8))   // 1 at -8%
  const neutrality   = Math.max(0, 1 - Math.abs(trend) / 5)  // 1 at flat, 0 at ±5%

  // High IV absolute level benefits volatility sellers
  const ivHighness = Math.min(1, Math.max(0, (iv - 20) / 50))  // 0 at 20%, 1 at 70%+

  // ── Per-strategy scoring ────────────────────────────────────────────────────

  const raw = {
    ironCondor: (
      0.45 * ivRichness +
      0.35 * neutrality +
      0.20 * ivHighness
    ),
    shortStraddle: (
      0.40 * ivRichness +
      0.30 * neutrality +
      0.30 * ivHighness
    ),
    bullCallSpread: (
      0.50 * bullStrength +
      0.30 * (ivRv < 1.5 ? 1 : 0.4) +  // spreads work in most IV envs
      0.20 * (ivRichness * 0.5 + 0.5)   // slight edge when IV rich (premiums offset)
    ),
    bearPutSpread: (
      0.50 * bearStrength +
      0.30 * (ivRv < 1.5 ? 1 : 0.4) +
      0.20 * (ivRichness * 0.5 + 0.5)
    ),
    longCall: (
      0.55 * bullStrength +
      0.45 * ivCheapness
    ),
    longPut: (
      0.55 * bearStrength +
      0.45 * ivCheapness
    ),
    longStraddle: (
      0.50 * ivCheapness +
      0.50 * neutrality  // neutral price + cheap options = straddle
    ),
    coveredCall: (
      0.40 * ivRichness +
      0.35 * (bullStrength * 0.5 + neutrality * 0.5) +
      0.25 * ivHighness
    ),
  }

  return raw
}

// ─── Signal display data ──────────────────────────────────────────────────────

function buildSignals(stockData) {
  const { stats } = stockData
  const ivRv  = parseFloat(stats.ivRv)
  const trend = parseFloat(stats.change30d)
  const iv    = parseFloat(stats.impliedVol)
  const rv    = parseFloat(stats.realizedVol)

  return {
    ivRv: {
      label: 'IV / RV',
      value: `${ivRv}x`,
      positive: ivRv > 1,
      note: ivRv >= 1.3
        ? 'Options expensive — premium selling favoured'
        : ivRv <= 0.9
        ? 'Options cheap — premium buying favoured'
        : 'Options fairly priced',
    },
    trend: {
      label: '30d Trend',
      value: `${trend > 0 ? '+' : ''}${trend}%`,
      positive: Math.abs(trend) < 3 ? null : trend > 0,
      note: Math.abs(trend) < 2
        ? 'Range-bound — neutral strategies fit'
        : trend > 0
        ? `${trend > 5 ? 'Strong' : 'Mild'} uptrend — bullish strategies favoured`
        : `${trend < -5 ? 'Strong' : 'Mild'} downtrend — bearish strategies favoured`,
    },
    iv: {
      label: 'Implied Vol',
      value: `${iv}%`,
      positive: iv > 35 ? false : iv < 20 ? true : null,
      note: iv >= 50
        ? 'Very high IV — wide spreads, elevated premiums'
        : iv >= 30
        ? 'Elevated IV — selling strategies carry more edge'
        : iv >= 20
        ? 'Moderate IV — balanced environment'
        : 'Low IV — cheap options, buying attractive',
    },
    impliedMove: {
      label: 'Implied Move',
      value: `±${stockData.chains[1].impliedMove}%`,
      positive: null,
      note: `Market prices in a ±${stockData.chains[1].impliedMove}% move by ${stockData.chains[1].label}`,
    },
  }
}

// ─── Strategy metadata for display ───────────────────────────────────────────

const STRATEGY_META = {
  ironCondor: {
    name: 'Iron Condor',
    category: 'Neutral',
    categoryColor: 'text-blue-400',
    shortRationale: (s) => {
      const ivRv = parseFloat(s.stats.ivRv)
      const trend = parseFloat(s.stats.change30d)
      return `IV is ${ivRv}x realised vol (premium selling edge) and the stock has moved only ${Math.abs(trend).toFixed(1)}% over 30 days. A range-bound trade that collects credit from both the call and put sides.`
    },
    risk: 'Limited',
    reward: 'Limited',
  },
  shortStraddle: {
    name: 'Short Straddle',
    category: 'Neutral',
    categoryColor: 'text-blue-400',
    shortRationale: (s) => {
      const iv = parseFloat(s.stats.impliedVol)
      return `IV at ${iv}% is rich relative to realised vol. Collecting maximum ATM premium rewards a stable, range-bound tape. Note: unlimited risk if the stock makes a large move.`
    },
    risk: 'Unlimited',
    reward: 'Limited',
  },
  bullCallSpread: {
    name: 'Bull Call Spread',
    category: 'Bullish',
    categoryColor: 'text-profit',
    shortRationale: (s) => {
      const trend = parseFloat(s.stats.change30d)
      const ivRv = parseFloat(s.stats.ivRv)
      return `The stock has trended ${trend > 0 ? 'up' : 'flat'} ${Math.abs(trend).toFixed(1)}% in 30 days. Buying a call spread captures further upside while the short leg offsets ${ivRv >= 1.2 ? 'expensive' : 'some'} IV cost.`
    },
    risk: 'Limited',
    reward: 'Limited',
  },
  bearPutSpread: {
    name: 'Bear Put Spread',
    category: 'Bearish',
    categoryColor: 'text-loss',
    shortRationale: (s) => {
      const trend = parseFloat(s.stats.change30d)
      return `The stock has declined ${Math.abs(trend).toFixed(1)}% over 30 days with momentum suggesting further downside. The short put offsets the put skew premium, improving cost basis.`
    },
    risk: 'Limited',
    reward: 'Limited',
  },
  longCall: {
    name: 'Long Call',
    category: 'Bullish',
    categoryColor: 'text-profit',
    shortRationale: (s) => {
      const ivRv = parseFloat(s.stats.ivRv)
      const trend = parseFloat(s.stats.change30d)
      return `Strong ${trend.toFixed(1)}% upside momentum with IV/RV of ${ivRv}x — ${ivRv < 1 ? 'options are relatively cheap, making outright buying attractive' : 'the trend is strong enough to overcome elevated premium cost'}.`
    },
    risk: 'Limited',
    reward: 'Unlimited',
  },
  longPut: {
    name: 'Long Put',
    category: 'Bearish',
    categoryColor: 'text-loss',
    shortRationale: (s) => {
      const ivRv = parseFloat(s.stats.ivRv)
      return `Bearish trend + IV/RV of ${ivRv}x — ${ivRv < 1 ? 'puts are relatively affordable for downside protection' : 'strong enough decline to justify put premium'}. Unlimited upside relative to bear spread.`
    },
    risk: 'Limited',
    reward: 'High',
  },
  longStraddle: {
    name: 'Long Straddle',
    category: 'Volatile',
    categoryColor: 'text-amber-400',
    shortRationale: (s) => {
      const ivRv = parseFloat(s.stats.ivRv)
      const iv = parseFloat(s.stats.impliedVol)
      return `IV at ${iv}% is ${ivRv}x realised — ${ivRv < 1 ? 'options appear underpriced ahead of a potential catalyst. Straddle profits from any large move.' : 'high absolute vol environment; straddle suits if a catalyst could dwarf implied move.'}`
    },
    risk: 'Limited',
    reward: 'Unlimited',
  },
  coveredCall: {
    name: 'Covered Call',
    category: 'Neutral',
    categoryColor: 'text-blue-400',
    shortRationale: (s) => {
      const iv = parseFloat(s.stats.impliedVol)
      const trend = parseFloat(s.stats.change30d)
      return `${iv}% IV makes call premium attractive income against an existing long position. The ${trend.toFixed(1)}% 30d drift is ${Math.abs(trend) < 3 ? 'muted, allowing you to sell OTM calls without capping much upside' : 'moderate — strike selection matters to avoid early assignment'}.`
    },
    risk: 'Stock downside',
    reward: 'Capped',
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

function suggestShortStraddle(stockData, chain) {
  const S = stockData.currentPrice
  const { strikes } = chain
  const atmCall = findByDelta(strikes, 0.50, true)
  const atmPut  = findByDelta(strikes, 0.50, false)
  const totalCredit = (atmCall.call.bid + atmPut.put.bid).toFixed(2)
  return {
    description:
      `Sell $${atmCall.strike}C + $${atmPut.strike}P — Total credit ≈ $${totalCredit} · Profit zone: $${(atmCall.strike - parseFloat(totalCredit)).toFixed(0)}–$${(atmCall.strike + parseFloat(totalCredit)).toFixed(0)}`,
    legs: [
      { label: 'Sell Call', strike: atmCall.strike, premium: atmCall.call.bid, type: 'shortCall' },
      { label: 'Sell Put',  strike: atmPut.strike,  premium: atmPut.put.bid,  type: 'shortPut'  },
    ],
    simulatorLoad: {
      strategyId: 'shortStraddle',
      overrides: {
        stockPrice:  S,
        strike:      atmCall.strike,
        callPremium: atmCall.call.bid,
        putPremium:  atmPut.put.bid,
      },
    },
  }
}

const SETUP_BUILDERS = {
  ironCondor:    suggestIronCondor,
  shortStraddle: suggestShortStraddle,
  bullCallSpread:suggestBullCallSpread,
  bearPutSpread: suggestBearPutSpread,
  longCall:      suggestLongCall,
  longPut:       suggestLongPut,
  longStraddle:  suggestLongStraddle,
  coveredCall:   suggestCoveredCall,
}

/**
 * Returns ALL 8 strategies sorted by score, each with their suggested setup
 * and P&L stats computed from the recommended strikes/premiums.
 * Used by the strategy comparison table.
 */
export function getAllStrategiesData(stockData) {
  const scores = scoreStrategies(stockData)
  const chain  = stockData.chains[1]

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([id, rawScore]) => {
      const meta  = STRATEGY_META[id]
      const setup = SETUP_BUILDERS[id]?.(stockData, chain) ?? null
      const score = Math.round(rawScore * 100)
      const strategy = strategiesById[id]
      const stats = (setup && strategy)
        ? strategy.getStats(setup.simulatorLoad.overrides)
        : null
      return { strategyId: id, name: meta.name, category: meta.category,
               categoryColor: meta.categoryColor, score, risk: meta.risk,
               reward: meta.reward, rationale: meta.shortRationale(stockData), setup, stats }
    })
}



export function getRecommendations(stockData, topN = 3) {
  const scores = scoreStrategies(stockData)
  const signals = buildSignals(stockData)
  const chain = stockData.chains[1] // use longer-dated chain (more realistic setups)

  const ranked = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([id, rawScore], rank) => {
      const meta = STRATEGY_META[id]
      const setup = SETUP_BUILDERS[id]?.(stockData, chain) ?? null
      const score = Math.round(rawScore * 100)
      return {
        rank: rank + 1,
        strategyId: id,
        name: meta.name,
        category: meta.category,
        categoryColor: meta.categoryColor,
        score,
        confidence: score >= 75 ? 'High' : score >= 55 ? 'Moderate' : 'Low',
        rationale: meta.shortRationale(stockData),
        risk: meta.risk,
        reward: meta.reward,
        setup,
        signals: Object.values(signals),
        keySignals: Object.values(signals).slice(0, 3),
      }
    })

  return { recommendations: ranked, signals: Object.values(signals) }
}
