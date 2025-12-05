import { parentPort } from 'node:worker_threads'
import { AVERAGE_BLOCKS_PER_DAY, type EvmChain } from '@codefi/mmi-defi-adapters'
import type { JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import { buildHistoricCache } from './cache/build-historic-cache.js'
import { type UserIndex, buildLatestCache } from './cache/build-latest-cache.js'
import { createWatchKey } from './cache/create-watch-key.js'
import type { CacheClient } from './database/postgres-cache-client.js'

const SIXTY_SECONDS = 60_000

export async function runnerLoop({
  blockNumber,
  provider,
  chainId,
  cacheClient,
  logger,
}: {
  blockNumber: number
  provider: JsonRpcProvider
  chainId: EvmChain
  cacheClient: CacheClient
  logger: Logger
}) {
  const historicCacheLoop = async () => {
    while (true) {
      await buildHistoricCache(
        provider,
        chainId,
        cacheClient,
        logger.child({
          subService: 'historic-cache',
        }),
      )
    }
  }

  const latestCacheLoop = async () => {
    const allJobs = await cacheClient.fetchAllJobs()

    const userIndexMap: UserIndex = new Map(
      allJobs.map(
        ({
          contractAddress,
          topic0,
          userAddressIndex,
          eventAbi,
          additionalMetadataArguments,
          transformUserAddressType,
        }) => [
          createWatchKey(contractAddress, topic0),
          {
            userAddressIndex,
            eventAbi,
            additionalMetadataArguments,
            transformUserAddressType,
          },
        ],
      ),
    )

    let nextProcessingBlockNumber = blockNumber
    let latestBlockNumber = await provider.getBlockNumber()

    const BLOCKS_PER_HOUR = AVERAGE_BLOCKS_PER_DAY[chainId] / 24

    setInterval(() => {
      const blocksLagging = latestBlockNumber - nextProcessingBlockNumber - 1
      const lagInHours = (blocksLagging / BLOCKS_PER_HOUR).toFixed(1)

      logger.info(
        {
          processingBlockNumber: nextProcessingBlockNumber,
          latestBlockNumber,
          blocksLagging,
          blocksPerHour: BLOCKS_PER_HOUR,
          lagInHours,
        },
        'Latest block cache update',
      )
    }, SIXTY_SECONDS)

    while (true) {
      const result = await buildLatestCache({
        processingBlockNumber: nextProcessingBlockNumber,
        provider,
        cacheClient,
        userIndexMap,
        logger: logger.child({
          subService: 'latest-cache',
        }),
      })

      nextProcessingBlockNumber = result.nextProcessingBlockNumber
      latestBlockNumber = result.latestBlockNumber

      // Report block number to parent process for health monitoring
      parentPort?.postMessage({
        chainId,
        lastProcessedBlockNumber: nextProcessingBlockNumber - 1,
        latestBlockNumber,
      })
    }
  }

  await Promise.all([historicCacheLoop(), latestCacheLoop()])
}
