import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAllStockData } from '../data/api.js'
import { allStocksData } from '../data/marketData.js'  // static fallback

/**
 * Manages the full data lifecycle for a given symbol:
 *   1. Immediately provides static fallback data (instant render, no flash)
 *   2. Fires a live Yahoo Finance fetch in the background
 *   3. On success: swaps in live data and reports source flags
 *   4. On failure: keeps static data, surfaces the error
 *
 * Returns:
 *   data         – stock data object (static fallback → live as available)
 *   loading      – true while the first live fetch is in-flight
 *   error        – string | null  (null when live data arrived cleanly)
 *   refresh      – () => void  — re-fetch on demand
 *   lastUpdated  – Date | null
 *   priceSource  – 'live' | 'static'
 *   optionsSource– 'live' | 'computed' | 'static'
 */
export function useMarketData(symbol) {
  const fallback = allStocksData[symbol] ?? null

  const [state, setState] = useState({
    data:          fallback,
    loading:       true,
    error:         null,
    lastUpdated:   null,
    priceSource:   'static',
    optionsSource: 'static',
  })

  // Track in-flight symbol so stale responses are discarded
  const activeSymbol = useRef(symbol)

  const load = useCallback(async (sym, force = false) => {
    activeSymbol.current = sym
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const liveData = await fetchAllStockData(sym, force)

      // Discard if the user switched symbols while this was fetching
      if (activeSymbol.current !== sym) return

      setState({
        data:          liveData,
        loading:       false,
        error:         null,
        lastUpdated:   liveData.lastUpdated,
        priceSource:   liveData.priceSource,
        optionsSource: liveData.optionsSource,
      })
    } catch (err) {
      if (activeSymbol.current !== sym) return

      // Categorise the error for a helpful UI message
      let message = err.message ?? 'Unknown error'
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        message = 'Network error — is the Vite dev server running? (npm run dev)'
      } else if (message.includes('401') || message.includes('403')) {
        message = 'Yahoo Finance authentication failed — using static data'
      } else if (message.includes('429')) {
        message = 'Yahoo Finance rate limit — try again in a moment'
      }

      setState({
        data:          allStocksData[sym] ?? null,  // revert to static fallback (null for unknown symbols)
        loading:       false,
        error:         message,
        lastUpdated:   null,
        priceSource:   'static',
        optionsSource: 'static',
      })
    }
  }, [])

  // Trigger fetch when symbol changes
  useEffect(() => {
    // Reset to static fallback for the new symbol immediately (null for unknown symbols)
    setState({
      data:          allStocksData[symbol] ?? null,
      loading:       true,
      error:         null,
      lastUpdated:   null,
      priceSource:   'static',
      optionsSource: 'static',
    })
    load(symbol)
  }, [symbol, load])

  const refresh = useCallback(() => load(symbol, true), [symbol, load])

  return { ...state, refresh }
}
