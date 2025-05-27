import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { extractErrorMessage } from './extractErrorMessage.js'
import { logger } from './logger.js'
import { runner } from './runner.js'

if (!process.env.CACHE_DATABASE_URL) {
  logger.error('CACHE_DATABASE_URL is required')
  process.exit(1)
}

logger.info('Starting workers')

const defiProvider = new DefiProvider()

await Promise.all(
  Object.values(EvmChain).map(async (chainId) => {
    const childLogger = logger.child({ chainId })
    await runner(
      defiProvider,
      process.env.CACHE_DATABASE_URL!,
      chainId,
      childLogger,
    ).catch((error) => {
      childLogger.error(
        { error: extractErrorMessage(error) },
        'Runner execution failed',
      )
    })
  }),
)
