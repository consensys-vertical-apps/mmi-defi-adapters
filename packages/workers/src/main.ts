import { EvmChain } from '@metamask-institutional/defi-adapters'
import { logger } from './logger.js'
import { runner } from './runner.js'

if (!process.env.CACHE_DATABASE_URL) {
  logger.error('CACHE_DATABASE_URL is required')
  process.exit(1)
}

logger.info('Starting workers')

await Promise.all(
  Object.values(EvmChain).map(async (chainId) => {
    const childLogger = logger.child({ chainId })
    await runner(process.env.CACHE_DATABASE_URL!, chainId, childLogger)
  }),
)
