export const CATEGORIES = {
  BULLISH: 'Bullish',
  BEARISH: 'Bearish',
  NEUTRAL: 'Neutral',
  VOLATILE: 'Volatile',
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Math.abs(n).toFixed(2)}`

// ─── Strategy Definitions ─────────────────────────────────────────────────────

const longCall = {
  id: 'longCall',
  name: 'Long Call',
  category: CATEGORIES.BULLISH,
  shortDesc: 'Buy a call — unlimited upside, limited downside',
  description:
    'You purchase the right to buy shares at the strike price. You profit when the stock rises above the breakeven point. Risk is limited to the premium paid.',
  params: [
    { key: 'stockPrice', label: 'Current Stock Price', min: 50, max: 200, step: 1, default: 100 },
    { key: 'strike', label: 'Strike Price (K)', min: 50, max: 200, step: 1, default: 105 },
    { key: 'premium', label: 'Premium Paid', min: 0.5, max: 30, step: 0.5, default: 5 },
  ],
  // P&L = max(0, S - K) - Premium
  calculate: ({ strike, premium }, S) => Math.max(0, S - strike) - premium,
  getStats: ({ strike, premium }) => ({
    maxProfit: 'Unlimited',
    maxLoss: { value: -premium, label: `-${fmt(premium)}` },
    breakevens: [strike + premium],
  }),
}

const longPut = {
  id: 'longPut',
  name: 'Long Put',
  category: CATEGORIES.BEARISH,
  shortDesc: 'Buy a put — profit when stock falls',
  description:
    'You purchase the right to sell shares at the strike price. You profit when the stock drops below the breakeven. Risk is capped at the premium paid.',
  params: [
    { key: 'stockPrice', label: 'Current Stock Price', min: 50, max: 200, step: 1, default: 100 },
    { key: 'strike', label: 'Strike Price (K)', min: 50, max: 200, step: 1, default: 95 },
    { key: 'premium', label: 'Premium Paid', min: 0.5, max: 30, step: 0.5, default: 5 },
  ],
  // P&L = max(0, K - S) - Premium
  calculate: ({ strike, premium }, S) => Math.max(0, strike - S) - premium,
  getStats: ({ strike, premium }) => ({
    maxProfit: { value: strike - premium, label: fmt(strike - premium) },
    maxLoss: { value: -premium, label: `-${fmt(premium)}` },
    breakevens: [strike - premium],
  }),
}

const bullCallSpread = {
  id: 'bullCallSpread',
  name: 'Bull Call Spread',
  category: CATEGORIES.BULLISH,
  shortDesc: 'Buy low call, sell high call — capped profit, reduced cost',
  description:
    'Buy a call at a lower strike (K₁) and sell a call at a higher strike (K₂). The premium received from the short call reduces your cost. Both profit and loss are capped.',
  params: [
    { key: 'stockPrice', label: 'Current Stock Price', min: 50, max: 200, step: 1, default: 100 },
    { key: 'strike1', label: 'Long Call Strike (K₁)', min: 50, max: 190, step: 1, default: 100 },
    { key: 'premium1', label: 'Long Call Premium (C₁)', min: 0.5, max: 30, step: 0.5, default: 8 },
    { key: 'strike2', label: 'Short Call Strike (K₂)', min: 60, max: 200, step: 1, default: 115 },
    { key: 'premium2', label: 'Short Call Premium (C₂)', min: 0.5, max: 25, step: 0.5, default: 3 },
  ],
  // Net debit = C₁ - C₂
  // P&L = max(0, S - K₁) - max(0, S - K₂) - netDebit
  calculate: ({ strike1, premium1, strike2, premium2 }, S) => {
    const netDebit = premium1 - premium2
    return Math.max(0, S - strike1) - Math.max(0, S - strike2) - netDebit
  },
  getStats: ({ strike1, premium1, strike2, premium2 }) => {
    const netDebit = premium1 - premium2
    const maxProfit = strike2 - strike1 - netDebit
    return {
      maxProfit: { value: maxProfit, label: fmt(maxProfit) },
      maxLoss: { value: -netDebit, label: `-${fmt(netDebit)} (net debit)` },
      breakevens: [strike1 + netDebit],
    }
  },
}

const bearPutSpread = {
  id: 'bearPutSpread',
  name: 'Bear Put Spread',
  category: CATEGORIES.BEARISH,
  shortDesc: 'Buy high put, sell low put — bearish with limited risk',
  description:
    'Buy a put at a higher strike (K₂) and sell a put at a lower strike (K₁). You pay a net debit and profit when the stock falls, up to a capped maximum.',
  params: [
    { key: 'stockPrice', label: 'Current Stock Price', min: 50, max: 200, step: 1, default: 100 },
    { key: 'strike2', label: 'Long Put Strike (K₂)', min: 60, max: 200, step: 1, default: 100 },
    { key: 'premium2', label: 'Long Put Premium (P₂)', min: 0.5, max: 30, step: 0.5, default: 7 },
    { key: 'strike1', label: 'Short Put Strike (K₁)', min: 50, max: 190, step: 1, default: 85 },
    { key: 'premium1', label: 'Short Put Premium (P₁)', min: 0.5, max: 25, step: 0.5, default: 2 },
  ],
  // Net debit = P₂ - P₁
  // P&L = max(0, K₂ - S) - max(0, K₁ - S) - netDebit
  calculate: ({ strike1, premium1, strike2, premium2 }, S) => {
    const netDebit = premium2 - premium1
    return Math.max(0, strike2 - S) - Math.max(0, strike1 - S) - netDebit
  },
  getStats: ({ strike1, premium1, strike2, premium2 }) => {
    const netDebit = premium2 - premium1
    const maxProfit = strike2 - strike1 - netDebit
    return {
      maxProfit: { value: maxProfit, label: fmt(maxProfit) },
      maxLoss: { value: -netDebit, label: `-${fmt(netDebit)} (net debit)` },
      breakevens: [strike2 - netDebit],
    }
  },
}

const longStraddle = {
  id: 'longStraddle',
  name: 'Long Straddle',
  category: CATEGORIES.VOLATILE,
  shortDesc: 'Buy call + put at same strike — profit from big moves',
  description:
    'Buy both a call and a put at the same strike price. You profit if the stock makes a large move in either direction. You lose the combined premium if the stock stays near the strike.',
  params: [
    { key: 'stockPrice', label: 'Current Stock Price', min: 50, max: 200, step: 1, default: 100 },
    { key: 'strike', label: 'Strike Price (K)', min: 50, max: 200, step: 1, default: 100 },
    { key: 'callPremium', label: 'Call Premium (Cₓ)', min: 0.5, max: 25, step: 0.5, default: 5 },
    { key: 'putPremium', label: 'Put Premium (Pₓ)', min: 0.5, max: 25, step: 0.5, default: 5 },
  ],
  // P&L = max(0, S - K) + max(0, K - S) - (callPremium + putPremium)
  calculate: ({ strike, callPremium, putPremium }, S) => {
    const totalPremium = callPremium + putPremium
    return Math.max(0, S - strike) + Math.max(0, strike - S) - totalPremium
  },
  getStats: ({ strike, callPremium, putPremium }) => {
    const totalPremium = callPremium + putPremium
    return {
      maxProfit: 'Unlimited',
      maxLoss: { value: -totalPremium, label: `-${fmt(totalPremium)} (total premium)` },
      breakevens: [strike - totalPremium, strike + totalPremium],
    }
  },
}

const shortStraddle = {
  id: 'shortStraddle',
  name: 'Short Straddle',
  category: CATEGORIES.NEUTRAL,
  shortDesc: 'Sell call + put — profit if stock stays flat',
  description:
    'Sell both a call and a put at the same strike. You collect the combined premium and profit if the stock stays near the strike. Risk is theoretically unlimited.',
  params: [
    { key: 'stockPrice', label: 'Current Stock Price', min: 50, max: 200, step: 1, default: 100 },
    { key: 'strike', label: 'Strike Price (K)', min: 50, max: 200, step: 1, default: 100 },
    { key: 'callPremium', label: 'Call Premium (Cₓ)', min: 0.5, max: 25, step: 0.5, default: 5 },
    { key: 'putPremium', label: 'Put Premium (Pₓ)', min: 0.5, max: 25, step: 0.5, default: 5 },
  ],
  // P&L = -(max(0,S-K) + max(0,K-S)) + (callPremium + putPremium)
  calculate: ({ strike, callPremium, putPremium }, S) => {
    const totalPremium = callPremium + putPremium
    return -(Math.max(0, S - strike) + Math.max(0, strike - S)) + totalPremium
  },
  getStats: ({ strike, callPremium, putPremium }) => {
    const totalPremium = callPremium + putPremium
    return {
      maxProfit: { value: totalPremium, label: fmt(totalPremium) },
      maxLoss: 'Unlimited',
      breakevens: [strike - totalPremium, strike + totalPremium],
    }
  },
}

const ironCondor = {
  id: 'ironCondor',
  name: 'Iron Condor',
  category: CATEGORIES.NEUTRAL,
  shortDesc: 'Four-leg neutral strategy — profit in a price range',
  description:
    'Sell an OTM put spread and an OTM call spread simultaneously. You collect a net credit and profit if the stock stays within the two inner strikes at expiration.',
  params: [
    { key: 'stockPrice', label: 'Current Stock Price', min: 50, max: 200, step: 1, default: 100 },
    { key: 'buyPutStrike', label: 'Buy Put Strike (K₁, outer)', min: 50, max: 190, step: 1, default: 80 },
    { key: 'buyPutPremium', label: 'Buy Put Premium', min: 0.25, max: 15, step: 0.25, default: 1 },
    { key: 'sellPutStrike', label: 'Sell Put Strike (K₂, inner)', min: 55, max: 195, step: 1, default: 90 },
    { key: 'sellPutPremium', label: 'Sell Put Premium', min: 0.25, max: 15, step: 0.25, default: 3 },
    { key: 'sellCallStrike', label: 'Sell Call Strike (K₃, inner)', min: 55, max: 195, step: 1, default: 110 },
    { key: 'sellCallPremium', label: 'Sell Call Premium', min: 0.25, max: 15, step: 0.25, default: 3 },
    { key: 'buyCallStrike', label: 'Buy Call Strike (K₄, outer)', min: 60, max: 200, step: 1, default: 120 },
    { key: 'buyCallPremium', label: 'Buy Call Premium', min: 0.25, max: 15, step: 0.25, default: 1 },
  ],
  calculate: (
    { buyPutStrike, buyPutPremium, sellPutStrike, sellPutPremium, sellCallStrike, sellCallPremium, buyCallStrike, buyCallPremium },
    S
  ) => {
    const netCredit = sellPutPremium + sellCallPremium - buyPutPremium - buyCallPremium
    const putLeg = -Math.max(0, sellPutStrike - S) + Math.max(0, buyPutStrike - S)
    const callLeg = -Math.max(0, S - sellCallStrike) + Math.max(0, S - buyCallStrike)
    return netCredit + putLeg + callLeg
  },
  getStats: ({ buyPutStrike, buyPutPremium, sellPutStrike, sellPutPremium, sellCallStrike, sellCallPremium, buyCallStrike, buyCallPremium }) => {
    const netCredit = sellPutPremium + sellCallPremium - buyPutPremium - buyCallPremium
    const putSpreadWidth = sellPutStrike - buyPutStrike
    const callSpreadWidth = buyCallStrike - sellCallStrike
    const maxLoss = -Math.max(putSpreadWidth, callSpreadWidth) + netCredit
    return {
      maxProfit: { value: netCredit, label: fmt(netCredit) },
      maxLoss: { value: maxLoss, label: fmt(Math.abs(maxLoss)) },
      breakevens: [sellPutStrike - netCredit, sellCallStrike + netCredit],
    }
  },
}

const coveredCall = {
  id: 'coveredCall',
  name: 'Covered Call',
  category: CATEGORIES.NEUTRAL,
  shortDesc: 'Own stock + sell call — generate income on holdings',
  description:
    'You own 100 shares and sell an OTM call to collect premium. You profit up to the strike, then your gains are capped. The premium offsets some downside.',
  params: [
    { key: 'stockPrice', label: 'Purchase Price of Stock', min: 50, max: 200, step: 1, default: 100 },
    { key: 'strike', label: 'Short Call Strike (K)', min: 50, max: 200, step: 1, default: 110 },
    { key: 'premium', label: 'Premium Received', min: 0.5, max: 20, step: 0.5, default: 4 },
  ],
  // P&L = (S - stockPrice) + premium - max(0, S - strike)
  calculate: ({ stockPrice, strike, premium }, S) => {
    return (S - stockPrice) + premium - Math.max(0, S - strike)
  },
  getStats: ({ stockPrice, strike, premium }) => {
    const maxProfit = strike - stockPrice + premium
    return {
      maxProfit: { value: maxProfit, label: fmt(maxProfit) },
      maxLoss: 'Theoretically unlimited (stock → 0)',
      breakevens: [stockPrice - premium],
    }
  },
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const strategiesList = [
  longCall,
  bullCallSpread,
  coveredCall,
  longPut,
  bearPutSpread,
  longStraddle,
  shortStraddle,
  ironCondor,
]

export const strategiesById = Object.fromEntries(strategiesList.map((s) => [s.id, s]))

export const strategiesByCategory = strategiesList.reduce((acc, s) => {
  if (!acc[s.category]) acc[s.category] = []
  acc[s.category].push(s)
  return acc
}, {})

// Generate chart data over a price range
export function generateChartData(strategy, params) {
  const center = params.stockPrice ?? 100
  const low = Math.max(1, center * 0.5)
  const high = center * 1.5
  const steps = 300

  const data = []
  for (let i = 0; i <= steps; i++) {
    const S = low + (i / steps) * (high - low)
    const pnl = strategy.calculate(params, S)
    data.push({
      price: parseFloat(S.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(4)),
      profit: pnl >= 0 ? parseFloat(pnl.toFixed(4)) : 0,
      loss: pnl < 0 ? parseFloat(pnl.toFixed(4)) : 0,
    })
  }
  return data
}
