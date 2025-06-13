import { JsonRpcProvider } from 'ethers'
import type { Logger } from 'pino'
import type { CacheClient } from '../database/postgres-cache-client.js'
import { extractErrorMessage } from '../utils/extractErrorMessage.js'
import { processBlock } from './process-block.js'
import { waitForBlock } from './wait-for-block.js'

const ONE_SECOND = 1_000
const BATCH_SIZE = Number(process.env.BLOCK_RUNNER_BATCH_SIZE) || 10

/**
 * This function represents a single iteration that processes a block (or batch of blocks) to build the latest cache.
 *
 * Steps:
 * 1. Wait for the block to be ready
 *    a. Fetch the latest block number from the provider.
 *    b. If the latest block number is equal or greater than the target block number, return the latest block number.
 *    c. If the latest block number is less than the target block number or there's an error, repeat step 1b after a delay.
 * 2. Use the difference between the latest block number and the target block number to determine if batching is needed.
 *    a. If batching is needed, process a batch of blocks.
 *    b. If batching is not needed, process a single block.
 * 3. For every block processed.
 *    a. Fetch the logs for the block.
 *    b. For each log, check if it's an event we're watching for.
 *    c. If it's an event we're watching for, parse the log and add the entry to the list.
 *    d. Return the list of logs
 * 4. Insert the logs into the database
 * 5. Return the next block number to process and the latest block number.
 */
export async function buildLatestCache({
  processingBlockNumber,
  provider,
  cacheClient,
  userIndexMap,
  logger,
}: {
  processingBlockNumber: number
  provider: JsonRpcProvider
  cacheClient: CacheClient
  userIndexMap: Map<
    string,
    {
      userAddressIndex: number
      eventAbi: string | null
    }
  >
  logger: Logger
}): Promise<{
  nextProcessingBlockNumber: number
  latestBlockNumber: number
}> {
  let nextProcessingBlockNumber: number

  const latestBlockNumber = await waitForBlock(
    processingBlockNumber,
    provider,
    logger,
  )

  try {
    nextProcessingBlockNumber = await processBlocks({
      processingBlockNumber,
      latestBlockNumber,
      provider,
      userIndexMap,
      cacheClient,
      logger,
    })
  } catch (error) {
    logger.error(
      {
        error,
        processingBlockNumber,
        latestBlockNumber,
      },
      'Error processing block',
    )

    nextProcessingBlockNumber = await processError(
      processingBlockNumber,
      cacheClient,
      logger,
    )

    await new Promise((res) => setTimeout(res, ONE_SECOND))
  }

  return {
    nextProcessingBlockNumber,
    latestBlockNumber,
  }
}

async function processBlocks({
  processingBlockNumber,
  latestBlockNumber,
  provider,
  userIndexMap,
  cacheClient,
  logger,
}: {
  processingBlockNumber: number
  latestBlockNumber: number
  provider: JsonRpcProvider
  userIndexMap: Map<
    string,
    {
      userAddressIndex: number
      eventAbi: string | null
    }
  >
  cacheClient: CacheClient
  logger: Logger
}) {
  const shouldBatch = latestBlockNumber - processingBlockNumber > BATCH_SIZE

  let logs: { address: string; contractAddress: string }[]
  let latestProcessedBlockNumber: number

  if (shouldBatch) {
    const batchEndBlock = Math.min(
      processingBlockNumber + BATCH_SIZE,
      latestBlockNumber,
    )

    const blockRange = Array.from(
      { length: batchEndBlock - processingBlockNumber },
      (_, index) => processingBlockNumber + index,
    )

    logs = (
      await Promise.all(
        blockRange.map((blockNumber) =>
          processBlock({
            provider,
            blockNumber,
            userIndexMap,
            logger,
          }),
        ),
      )
    ).flat()

    latestProcessedBlockNumber = batchEndBlock - 1
  } else {
    logs = await processBlock({
      provider,
      blockNumber: processingBlockNumber,
      userIndexMap,
      logger,
    })

    latestProcessedBlockNumber = processingBlockNumber
  }

  if (logs.length > 0) {
    // note we reduced db writes by only updating blocknumber when we have logs this improved performance
    await cacheClient.insertLogs(logs, latestProcessedBlockNumber)
  }

  return latestProcessedBlockNumber + 1
}

async function processError(
  processingBlockNumber: number,
  cacheClient: CacheClient,
  logger: Logger,
): Promise<number> {
  const earliestSafeBlock = processingBlockNumber - BATCH_SIZE

  try {
    await cacheClient.updateLatestBlockProcessed(earliestSafeBlock)

    return earliestSafeBlock
  } catch (error) {
    logger.error(
      {
        processingBlockNumber,
        earliestSafeBlock,
        error: extractErrorMessage(error),
      },
      'Error trying to rollback latest block processed',
    )

    return processingBlockNumber
  }
}
