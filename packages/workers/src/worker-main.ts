import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { extractErrorMessage } from './utils/extractErrorMessage.js'
import { logger } from './logger.js'
import { runner } from './runner.js'

if (!process.env.CACHE_DATABASE_URL) {
  logger.error('CACHE_DATABASE_URL is required')
  process.exit(1)
}

logger.info('Worker started: Processing EVM chains')
const defiProvider = new DefiProvider()

await Promise.all(
  Object.values(EvmChain).map(async (chainId) => {
    const childLogger = logger.child({ chainId })
    try {
      await runner(
        defiProvider,
        process.env.CACHE_DATABASE_URL!,
        chainId,
        childLogger,
      )
    } catch (error) {
      childLogger.error(
        { chainId, error: extractErrorMessage(error) },
        'Runner execution failed',
      )
    }
  }),
)
