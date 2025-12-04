import { EvmChain } from '@codefi/defi-adapters'
import { JsonRpcProvider, getAddress } from 'ethers'
import type { Logger } from 'pino'
import type { CacheClient } from '../database/postgres-cache-client.js'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { fetchEvents } from './fetch-events.js'
import { getNextPoolGroup } from './get-next-pool-group.js'
import { parseUserEventLog } from './parse-user-event-log.js'

const SIXTY_SECONDS = 60_000

const MAX_CONCURRENT_BATCHES =
  Number(process.env.HISTORIC_CACHE_BATCH_SIZE) || 5

/**
 * This function represents a single iteration that processes pending pools to build the historic cache.
 *
 * Steps:
 * 1. Fetch the next set of pools that need processing from the database.
 *    a. First all the pending pools are fetched.
 *    b. The pools are grouped by topic0 and userAddressIndex.
 *    c. The group with the most entries is selected and the maximum block number is used as target.
 *    d. An optimal batch size is calculated.
 * 2. If no pools are pending, wait for 60 seconds and return.
 * 3. Process the group of pools in the batches returned in step 1.
 *    a. Split the block range into smaller ranges for concurrent processing.
 *    b. Fetch events for each concurrent range and inset logs.
 *    c. When all ranges have completed, mark the jobs as complete in the database.
 * 4. If an error occurs, mark the jobs as failed.
 */
export async function buildHistoricCache(
  provider: JsonRpcProvider,
  chainId: EvmChain,
  cacheClient: CacheClient,
  logger: Logger,
) {
  const unfinishedPools = await cacheClient.fetchUnfinishedJobs()

  const nextPoolGroup = await getNextPoolGroup(unfinishedPools, chainId)

  logger.info(
    {
      unfinishedPools: unfinishedPools.length,
      nextPoolGroup: nextPoolGroup?.poolAddresses.length,
      batchSize: nextPoolGroup?.batchSize,
    },
    'Pools waiting to be processed',
  )

  if (!nextPoolGroup) {
    await new Promise((resolve) => setTimeout(resolve, SIXTY_SECONDS))
    return
  }

  const {
    poolAddresses,
    topic0,
    eventAbi,
    userAddressIndex,
    additionalMetadataArguments,
    transformUserAddressType,
    targetBlockNumber,
    batchSize,
  } = nextPoolGroup

  const totalBatches = Math.ceil(poolAddresses.length / batchSize)

  const processedEntities = {
    poolsProcessed: 0,
    logsProcessed: 0,
    poolsFailed: 0,
    blocksProcessed: 0,
    batchesProcessed: 0,
  }

  const interval = setInterval(() => {
    logger.info(
      {
        unfinishedPools: unfinishedPools.length,
        nextPoolGroup: poolAddresses.length,
        batchSize,
        totalBatches,
        topic0,
        eventAbi,
        userAddressIndex,
        targetBlockNumber,
        ...processedEntities,
        blocksMissing: targetBlockNumber - processedEntities.blocksProcessed,
      },
      'Historic cache iteration progress',
    )
  }, SIXTY_SECONDS)

  for (let i = 0; i < poolAddresses.length; i += batchSize) {
    const contractAddresses = poolAddresses.slice(i, i + batchSize)

    logger.info(
      {
        batchIndex: i / batchSize + 1,
        totalBatches,
        batchSize: contractAddresses.length,
        totalPools: poolAddresses.length,
      },
      'Fetching logs from pools batch started',
    )

    try {
      // Start from block 0 for historical processing - this is correct for initial processing
      // The issue might be elsewhere. Let's keep this as is for now.
      const ranges = splitRange(0, targetBlockNumber, MAX_CONCURRENT_BATCHES)
      const concurrentRanges = ranges.map(async ({ from, to }) => {
        for await (const logs of fetchEvents({
          provider,
          contractAddresses,
          topic0,
          fromBlock: from,
          toBlock: to,
          logger,
        })) {
          const logsToInsert: {
            address: string
            contractAddress: string
            metadata?: Record<string, string>
          }[] = []
          for (const log of logs) {
            const contractAddress = getAddress(log.address.toLowerCase())

            try {
              const result = parseUserEventLog(
                log,
                eventAbi,
                userAddressIndex,
                additionalMetadataArguments,
                transformUserAddressType,
              )

              if (result) {
                logsToInsert.push({
                  address: result.userAddress,
                  contractAddress,
                  metadata: result.metadata,
                })
              }
            } catch (error) {
              logger.error(
                {
                  error: extractErrorMessage(error),
                  txHash: log.transactionHash,
                  eventAbi,
                  userAddressIndex,
                },
                'Error parsing log',
              )
            }
          }

          // Warning: Do not pass 'blockNumber' to insertLogs in history job. This can corrupt the logs database.
          // TODO: Improve type safety for insertLogs input parameters for history/latest jobs

          if (logsToInsert.length > 0) {
            await cacheClient.insertLogs(logsToInsert)
          }

          processedEntities.logsProcessed += logsToInsert.length
          processedEntities.blocksProcessed += to - from + 1
        }
      })

      await Promise.all(concurrentRanges)

      await cacheClient.updateJobStatus(
        contractAddresses,
        topic0,
        userAddressIndex,
        'completed',
      )

      processedEntities.poolsProcessed += contractAddresses.length
    } catch (error) {
      await cacheClient.updateJobStatus(
        contractAddresses,
        topic0,
        userAddressIndex,
        'failed',
      )

      logger.error(
        {
          batchIndex: i / batchSize + 1,
          totalBatches,
          batchSize: contractAddresses.length,
          totalPools: poolAddresses.length,
          error: extractErrorMessage(error),
        },
        'Fetching logs from pools batch failed',
      )

      processedEntities.poolsFailed += contractAddresses.length
    }

    processedEntities.batchesProcessed += 1
  }

  clearInterval(interval)
}

function splitRange(
  from: number,
  to: number,
  chunks: number,
): { from: number; to: number }[] {
  const totalSize = to - from + 1
  const rangeSize = Math.floor(totalSize / chunks)
  const remainder = totalSize % chunks
  const ranges: { from: number; to: number }[] = []

  for (let i = 0; i < chunks; i++) {
    const start = from + i * rangeSize + Math.min(i, remainder)
    const end = start + rangeSize - 1 + (i < remainder ? 1 : 0)
    ranges.push({ from: start, to: Math.min(end, to) })
  }

  return ranges
}
