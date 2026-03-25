import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getChart, getOptions } from './server/yahooProxy.js'

function marketDataPlugin() {
  return {
    name: 'market-data',
    configureServer(server) {
      server.middlewares.use('/api/market', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')

        try {
          const [, resource, rawSymbol] = (req.url ?? '').split('/')
          const symbol = (rawSymbol ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
          const force  = req.url?.includes('force=true')

          if (!symbol) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Symbol required' }))
          }

          const data =
            resource === 'chart'   ? await getChart(symbol, force) :
            resource === 'options' ? await getOptions(symbol, force) :
            null

          if (!data) {
            res.statusCode = 404
            return res.end(JSON.stringify({ error: `Unknown resource: ${resource}` }))
          }

          res.end(JSON.stringify(data))
        } catch (err) {
          console.error('[market-data]', err.message)
          res.statusCode = 502
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), marketDataPlugin()],
})
