/**
 * Yahoo Finance proxy using `yahoo-finance2`
 *
 * yahoo-finance2 handles the crumb/session lifecycle internally,
 * which is why it succeeds where raw fetch requests hit 429s and
 * 401 crumb-invalid errors.
 *
 * This module runs exclusively in Node.js (Vite middleware) and is
 * never bundled into the browser.
 */

import YahooFinance from 'yahoo-finance2'

// v3 uses a class — instantiate once and reuse
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
})

// ─── Simple in-memory cache ───────────────────────────────────────────────────

const _cache = new Map()

async function cached(key, ttlMs, fetcher) {
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data
  const data = await fetcher()
  _cache.set(key, { data, ts: Date.now() })
  return data
}

// ─── Chart: real price + 30-day history ──────────────────────────────────────

export async function getChart(symbol, force = false) {
  const key = `chart:${symbol}`
  if (force) _cache.delete(key)

  return cached(key, 5 * 60_000, async () => {
    // Fetch 35 calendar days to guarantee ≥20 trading-day closes
    const period1 = new Date()
    period1.setDate(period1.getDate() - 35)

    const result = await yahooFinance.chart(symbol, {
      period1: period1.toISOString().split('T')[0],
      interval: '1d',
    })

    const { meta, quotes } = result
    const closes = quotes
      .filter((q) => q.close != null)
      .map((q) => ({
        date:  q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date),
        close: q.close,
      }))

    // chart() doesn't include intraday change; use quote() for that
    let change = 0, changePercent = 0
    try {
      const q = await yahooFinance.quote(symbol, { fields: ['regularMarketChange', 'regularMarketChangePercent'] })
      change        = q.regularMarketChange        ?? 0
      changePercent = q.regularMarketChangePercent ?? 0
    } catch { /* non-critical */ }

    return {
      currentPrice: meta.regularMarketPrice,
      change,
      changePercent,
      history: closes,
    }
  })
}

// ─── Options: nearest expiration chain ───────────────────────────────────────

export async function getOptions(symbol, force = false) {
  const key = `options:${symbol}`
  if (force) _cache.delete(key)

  return cached(key, 2 * 60_000, async () => {
    const result = await yahooFinance.options(symbol)

    // Normalise: convert Date objects → Unix timestamps for client consumption
    const expirationDates = (result.expirationDates ?? []).map((d) =>
      d instanceof Date ? Math.floor(d.getTime() / 1000) : d
    )

    const options = (result.options ?? []).map((exp) => ({
      expirationDate:
        exp.expirationDate instanceof Date
          ? Math.floor(exp.expirationDate.getTime() / 1000)
          : exp.expirationDate,
      calls: (exp.calls ?? []).map(normaliseContract),
      puts:  (exp.puts  ?? []).map(normaliseContract),
    }))

    return { expirationDates, options }
  })
}

function normaliseContract(c) {
  return {
    strike:            c.strike,
    bid:               c.bid               ?? 0,
    ask:               c.ask               ?? 0,
    lastPrice:         c.lastPrice         ?? 0,
    volume:            c.volume            ?? 0,
    openInterest:      c.openInterest      ?? 0,
    impliedVolatility: c.impliedVolatility ?? 0.3,
    inTheMoney:        c.inTheMoney        ?? false,
  }
}
