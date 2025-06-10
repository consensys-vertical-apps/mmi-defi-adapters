import type { JsonRpcProvider } from 'ethers'
import { buildHistoricCache } from './build-historic-cache.js'
import { buildLatestCache, createWatchKey } from './build-latest-cache.js'
import type { EvmChain } from '@metamask-institutional/defi-adapters'
import type { CacheClient } from './postgres-cache-client.js'
import type { Logger } from 'pino'

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

      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  const latestCacheLoop = async () => {
    const allJobs = await cacheClient.fetchAllJobs()

    const userIndexMap = new Map(
      allJobs.map(({ contractAddress, topic0, userAddressIndex, eventAbi }) => [
        createWatchKey(contractAddress, topic0),
        { userAddressIndex, eventAbi },
      ]),
    )

    let processingBlockNumber = blockNumber
    while (true) {
      processingBlockNumber = await buildLatestCache({
        processingBlockNumber,
        provider,
        chainId,
        cacheClient,
        userIndexMap,
        logger: logger.child({
          subService: 'latest-cache',
        }),
      })
    }
  }

  await Promise.all([historicCacheLoop(), latestCacheLoop()])
}
