import { serve } from '@hono/node-server'
import { DefiProvider } from '@metamask-institutional/defi-adapters'
import { Hono } from 'hono'
import './bigint-json.js'
import { buildApi } from './build-api.js'
import { buildPoolFilter } from './build-pool-filter.js'
import { logger } from './logger.js'
import { buildMemoryUnwrapCacheProvider } from './memory-unwrap-price-cache-provider.js'

if (process.env.PORT && Number.isNaN(Number(process.env.PORT))) {
  logger.error('PORT is not set or is not a number')
  process.exit(1)
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000

const defiProvider = new DefiProvider({
  poolFilter: buildPoolFilter(),
  unwrapCacheProvider: buildMemoryUnwrapCacheProvider(),
})

const app = new Hono()
buildApi(app, defiProvider)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info({ port: info.port }, 'API server is running')
  },
)
