import { EvmChain } from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, getAddress } from 'ethers'
import type { Logger } from 'pino'
import { extractErrorMessage } from './extractErrorMessage.js'
import { fetchEvents } from './fetch-events.js'
import { parseUserEventLog } from './parse-user-event-log.js'
import type { CacheClient, JobDbEntry } from './postgres-cache-client.js'

const SIXTY_SECONDS = 60_000

// TODO: Create zod schema for config
const MaxConcurrentBatches = process.env.HISTORIC_CACHE_BATCH_SIZE
  ? Number(process.env.HISTORIC_CACHE_BATCH_SIZE)
  : 5

const MaxContractsPerCall: Record<EvmChain, number> = {
  [EvmChain.Ethereum]: 10,
  [EvmChain.Optimism]: 10,
  [EvmChain.Bsc]: 10,
  [EvmChain.Polygon]: 5,
  [EvmChain.Fantom]: 10,
  [EvmChain.Sei]: 10,
  [EvmChain.Base]: 10,
  [EvmChain.Arbitrum]: 10,
  [EvmChain.Avalanche]: 10,
  [EvmChain.Linea]: 10,
}

/**
 * This function continuously processes pending pools to build a historic cache.
 *
 * Steps:
 * 1. Fetch the next set of pools that need processing from the database.
 *    a. First all the pending pools are fetched.
 *    b. The pools are grouped by topic0 and userAddressIndex.
 *    c. The group with the most entries is selected and the maximum block number is used as target.
 *    d. An optimal batch size is calculated.
 * 2. If no pools are pending, wait for 30 seconds before checking again.
 * 3. Process the group of pools in the batches returned in step 1:
 *    a. Split the block range into smaller ranges for concurrent processing.
 *    b. Fetch events for each concurrent range and inset logs.
 *    c. When all ranges have completed, mark the jobs as complete in the database.
 * 4. If an error occurs, mark the jobs as failed.
 * 5. Log memory usage after processing each batch.
 * 6. Wait for 5 seconds before processing the next batch.
 */
export async function buildHistoricCache(
  provider: JsonRpcProvider,
  chainId: EvmChain,
  cacheClient: CacheClient,
  logger: Logger,
) {
  logger.info('Starting historic cache builder')

  while (true) {
    const unfinishedPools = await cacheClient.fetchUnfinishedJobs()

    const nextPoolGroup = getNextPoolGroup(
      unfinishedPools,
      MaxContractsPerCall[chainId],
    )

    logger.info(
      {
        unfinishedPools: unfinishedPools.length,
        nextPoolGroup: nextPoolGroup?.poolAddresses.length,
        batchSize: nextPoolGroup?.batchSize,
      },
      'Unfinished pools to process',
    )

    if (!nextPoolGroup) {
      await new Promise((resolve) => setTimeout(resolve, SIXTY_SECONDS))
      continue
    }

    const {
      poolAddresses,
      topic0,
      eventAbi,
      userAddressIndex,
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
        const ranges = splitRange(0, targetBlockNumber, MaxConcurrentBatches)
        const concurrentRanges = ranges.map(async ({ from, to }) => {
          for await (const logs of fetchEvents({
            provider,
            contractAddresses,
            topic0,
            fromBlock: from,
            toBlock: to,
            logger,
          })) {
            const logsToInsert: { address: string; contractAddress: string }[] =
              []
            for (const log of logs) {
              const contractAddress = getAddress(log.address.toLowerCase())

              try {
                const userAddress = parseUserEventLog(
                  log,
                  eventAbi,
                  userAddressIndex,
                )

                if (userAddress) {
                  logsToInsert.push({
                    address: userAddress,
                    contractAddress,
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

            await cacheClient.insertLogs(logsToInsert)

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

    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
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

function getNextPoolGroup(
  unfinishedPools: (Omit<JobDbEntry, 'status'> & {
    status: 'pending' | 'failed'
  })[],
  maxBatchSize: number,
):
  | {
      poolAddresses: string[]
      topic0: `0x${string}`
      eventAbi: string | null
      userAddressIndex: number
      targetBlockNumber: number
      batchSize: number
    }
  | undefined {
  if (unfinishedPools.length === 0) {
    return undefined
  }

  const pendingPools = unfinishedPools.filter(
    (pool) => pool.status === 'pending',
  )

  if (pendingPools.length > 0) {
    // Group pools by topic0 and userAddressIndex
    const groupedPools = pendingPools.reduce(
      (acc, pool) => {
        const key = `${pool.topic0}#${pool.userAddressIndex}`
        if (!acc[key]) {
          acc[key] = []
        }
        acc[key]!.push(pool)
        return acc
      },
      {} as Record<string, typeof pendingPools>,
    )

    // Find group with most entries
    const largestGroup = Object.values(groupedPools).reduce(
      (max, group) => (group.length > max.length ? group : max),
      [] as typeof pendingPools,
    )

    const batchSize =
      largestGroup.length <= maxBatchSize * 10
        ? 1
        : largestGroup.length >= maxBatchSize * 100
          ? maxBatchSize
          : Math.max(
              1,
              Math.floor(
                (largestGroup.length - maxBatchSize * 10) /
                  ((maxBatchSize * 100 - maxBatchSize * 10) / maxBatchSize),
              ),
            )

    return {
      poolAddresses: largestGroup.map((pool) => pool.contractAddress),
      topic0: largestGroup[0]!.topic0,
      eventAbi: largestGroup[0]!.eventAbi,
      userAddressIndex: largestGroup[0]!.userAddressIndex,
      targetBlockNumber: Math.max(
        ...largestGroup.map((pool) => pool.blockNumber),
      ),
      batchSize,
    }
  }

  const failedPools = unfinishedPools.filter((pool) => pool.status === 'failed')
  const { contractAddress, topic0, eventAbi, userAddressIndex, blockNumber } =
    failedPools[0]!
  return {
    poolAddresses: [contractAddress],
    topic0,
    eventAbi,
    userAddressIndex,
    targetBlockNumber: blockNumber,
    batchSize: 1,
  }
}
