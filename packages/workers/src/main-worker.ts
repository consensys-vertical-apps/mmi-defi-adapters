import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, Network } from 'ethers'
import type { Logger } from 'pino'
import { logger } from './logger.js'
import {
  type CacheClient,
  createPostgresCacheClient,
} from './database/postgres-cache-client.js'
import { runnerLoop } from './runner-loop.js'
import { updateNewJobs } from './update-new-jobs.js'
import { extractErrorMessage } from './utils/extractErrorMessage.js'

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
      childLogger.info('Starting worker')

      const cacheClient = await createPostgresCacheClient({
        dbUrl: process.env.CACHE_DATABASE_URL!,
        chainId,
        partialPoolConfig: {
          max: 15,
          connectionTimeoutMillis: 10_000,
        },
        logger: childLogger,
      })

      const providerUrl =
        defiProvider.chainProvider.providers[chainId]?._getConnection().url

      if (!providerUrl) {
        childLogger.error('Provider missing for this chain')
        return
      }

      const provider = new JsonRpcProvider(providerUrl, chainId, {
        staticNetwork: Network.from(chainId),
      })

      const blockNumber = await getBlockToProcess(
        cacheClient,
        provider,
        childLogger,
      )

      await updateNewJobs({
        chainId,
        blockNumber,
        defiProvider,
        cacheClient,
        logger: childLogger,
      })

      await runnerLoop({
        blockNumber,
        provider,
        chainId,
        cacheClient,
        logger: childLogger,
      })
    } catch (error) {
      childLogger.error(
        { chainId, error: extractErrorMessage(error) },
        'Runner execution failed',
      )
    }
  }),
)

async function getBlockToProcess(
  cacheClient: CacheClient,
  provider: JsonRpcProvider,
  logger: Logger,
) {
  const dbBlockNumber = await cacheClient.getLatestBlockProcessed()

  if (dbBlockNumber) {
    logger.info({ dbBlockNumber }, 'Last block processed fetched from DB')
    return dbBlockNumber
  }

  try {
    const blockNumber = await provider.getBlockNumber()
    logger.info({ blockNumber }, 'Block number fetched from provider')
    return blockNumber
  } catch (error) {
    logger.error(
      { error, providerUrl: provider._getConnection().url },
      'Error fetching block number',
    )
    process.exit(1)
  }
}
