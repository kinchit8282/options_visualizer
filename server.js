/**
 * Production server
 * - Serves the built React app from dist/
 * - Exposes /api/market/chart/:symbol and /api/market/options/:symbol
 *   using yahoo-finance2 (no separate proxy needed)
 *
 * Run:
 *   npm run build && npm start
 */

import express     from 'express'
import compression from 'compression'
import { fileURLToPath } from 'url'
import { dirname, join }  from 'path'
import { networkInterfaces } from 'os'
import { getChart, getOptions } from './server/yahooProxy.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT      = parseInt(process.env.PORT ?? '3000', 10)

const app = express()
app.use(compression())

// ─── API ──────────────────────────────────────────────────────────────────────

app.get('/api/market/chart/:symbol', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=180') // 3-min browser cache
  try {
    const data = await getChart(
      req.params.symbol.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      req.query.force === 'true',
    )
    res.json(data)
  } catch (err) {
    console.error('[chart]', err.message)
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/market/options/:symbol', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=90') // 90s browser cache
  try {
    const data = await getOptions(
      req.params.symbol.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      req.query.force === 'true',
    )
    res.json(data)
  } catch (err) {
    console.error('[options]', err.message)
    res.status(502).json({ error: err.message })
  }
})

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── Static React app ─────────────────────────────────────────────────────────

const DIST = join(__dirname, 'dist')
app.use(express.static(DIST, { maxAge: '7d', index: false }))

// SPA fallback — send index.html for every unmatched route (Express 5 wildcard syntax)
app.get('/{*path}', (_req, res) => res.sendFile(join(DIST, 'index.html')))

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  Options Strategy Visualizer\n`)
  console.log(`  Local:    http://localhost:${PORT}`)

  // Print LAN address so the user can share with family on the same network
  const nets = networkInterfaces()
  for (const iface of Object.values(nets)) {
    for (const addr of (iface ?? [])) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  Network:  http://${addr.address}:${PORT}  ← share this with family`)
      }
    }
  }
  console.log()
})
