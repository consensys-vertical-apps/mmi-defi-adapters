import { serve } from '@hono/node-server'
import { EvmChain } from '@metamask-institutional/defi-adapters'
import './bigint-json.js'
import { buildApi } from './build-api.js'
import { buildServices } from './build-services.js'
import { logger } from './logger.js'

process.setMaxListeners(Object.keys(EvmChain).length * 2)

if (process.env.PORT && Number.isNaN(Number(process.env.PORT))) {
  logger.error('PORT is not set or is not a number')
  process.exit(1)
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000

const { dbService, defiProvider } = buildServices()

const app = buildApi(defiProvider, dbService)

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info({ port: info.port }, 'API server is running')
  },
)
