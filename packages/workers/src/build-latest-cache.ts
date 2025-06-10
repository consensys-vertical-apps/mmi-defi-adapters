import { parentPort } from 'node:worker_threads'
import { type EvmChain } from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, TransactionReceipt, ethers, getAddress } from 'ethers'
import type { Logger } from 'pino'
import { extractErrorMessage } from './utils/extractErrorMessage.js'
import { parseUserEventLog } from './parse-user-event-log.js'
import type { CacheClient } from './postgres-cache-client.js'
import { withTimeout } from './utils/with-timeout.js'

const SIXTY_SECONDS = 60_000
const ONE_SECOND = 1_000

const BATCH_SIZE = Number(process.env.BLOCK_RUNNER_BATCH_SIZE) || 10

export async function buildLatestCache({
  processingBlockNumber,
  provider,
  chainId,
  cacheClient,
  userIndexMap,
  logger,
}: {
  processingBlockNumber: number
  provider: JsonRpcProvider
  chainId: EvmChain
  cacheClient: CacheClient
  userIndexMap: Map<
    string,
    {
      userAddressIndex: number
      eventAbi: string | null
    }
  >
  logger: Logger
}): Promise<number> {
  let nextProcessingBlockNumber: number
  let latestBlockNumber: number | undefined

  try {
    latestBlockNumber = await waitForBlockToBeReady(
      processingBlockNumber,
      provider,
      logger,
    )

    nextProcessingBlockNumber = await processBlocks({
      processingBlockNumber,
      latestBlockNumber,
      chainId,
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

  return nextProcessingBlockNumber
}

export function createWatchKey(
  contractAddress: string,
  topic0: string,
): string {
  return `${contractAddress.toLowerCase()}#${topic0.toLowerCase()}`
}

async function waitForBlockToBeReady(
  targetBlockNumber: number,
  provider: JsonRpcProvider,
  logger: Logger,
): Promise<number> {
  let backoff = ONE_SECOND

  while (true) {
    try {
      const latestBlockNumber = await withTimeout(provider.getBlockNumber())
      if (latestBlockNumber >= targetBlockNumber) {
        return latestBlockNumber
      }
    } catch (error) {
      logger.error(
        { error: extractErrorMessage(error) },
        'Error fetching block number',
      )
    }

    // Wait with exponential backoff before retrying
    await new Promise((resolve) => setTimeout(resolve, backoff))
    backoff = Math.min(backoff * 2, SIXTY_SECONDS)
  }
}

async function processBlocks({
  processingBlockNumber,
  latestBlockNumber,
  chainId,
  provider,
  userIndexMap,
  cacheClient,
  logger,
}: {
  processingBlockNumber: number
  latestBlockNumber: number
  chainId: EvmChain
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

  if (shouldBatch) {
    const batchEndBlock = Math.min(
      processingBlockNumber + BATCH_SIZE,
      latestBlockNumber,
    )

    const blockRange = Array.from(
      { length: batchEndBlock - processingBlockNumber },
      (_, index) => processingBlockNumber + index,
    )

    await Promise.all(
      blockRange.map((blockNumber) =>
        processBlock({
          chainId,
          provider,
          blockNumber,
          userIndexMap,
          cacheClient,
          logger,
        }),
      ),
    )

    return batchEndBlock
  }

  await processBlock({
    chainId,
    provider,
    blockNumber: processingBlockNumber,
    userIndexMap,
    cacheClient,
    logger,
  })

  return processingBlockNumber + 1
}

async function processBatchBlocks({
  chainId,
  provider,
  startBlock,
  latestBlockNumber,
  userIndexMap,
  cacheClient,
  logger,
}: {
  chainId: EvmChain
  provider: JsonRpcProvider
  startBlock: number
  latestBlockNumber: number
  userIndexMap: Map<
    string,
    {
      userAddressIndex: number
      eventAbi: string | null
    }
  >
  cacheClient: CacheClient
  logger: Logger
}): Promise<number> {
  const batchEndBlock = Math.min(startBlock + BATCH_SIZE, latestBlockNumber)
  const blockPromises: Promise<void>[] = []

  for (
    let blockNumber = startBlock;
    blockNumber < batchEndBlock;
    blockNumber++
  ) {
    blockPromises.push(
      processBlock({
        chainId,
        provider,
        blockNumber,
        userIndexMap,
        cacheClient,
        logger,
      }),
    )
  }

  await Promise.all(blockPromises)
  return batchEndBlock
}

async function processBlock({
  chainId,
  provider,
  blockNumber,
  userIndexMap,
  cacheClient,
  logger,
}: {
  chainId: EvmChain
  provider: JsonRpcProvider
  blockNumber: number
  userIndexMap: Map<
    string,
    {
      userAddressIndex: number
      eventAbi: string | null
    }
  >
  cacheClient: CacheClient
  logger: Logger
}): Promise<void> {
  const startTime = Date.now()
  const receipts: TransactionReceipt[] = await withTimeout(
    provider.send('eth_getBlockReceipts', [
      `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`, // some chains need to remove leading zeros like ftm
    ]),
  )

  const receiptsFetchTime = Date.now()

  const logs: { address: string; contractAddress: string }[] = []

  for (const receipt of receipts?.flat() || []) {
    for (const log of receipt.logs || []) {
      const topic0 = log.topics[0]
      if (!topic0) {
        continue
      }

      const contractAddress = getAddress(log.address.toLowerCase())

      const userIndexEntry = userIndexMap.get(
        createWatchKey(contractAddress, topic0),
      )
      if (!userIndexEntry) {
        continue
      }

      const { userAddressIndex, eventAbi } = userIndexEntry

      try {
        const userAddress = parseUserEventLog(log, eventAbi, userAddressIndex)

        if (userAddress) {
          logs.push({
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
  }

  const logsProcessedTime = Date.now()

  if (logs.length > 0) {
    await cacheClient.insertLogs(logs, blockNumber)
  }

  const logsInsertTime = Date.now()

  logger.debug(
    {
      blockNumber,
      logsProcessed: logs.length,
      startTime,
      totalTime: logsInsertTime - startTime,
      receiptsFetchTime: receiptsFetchTime - startTime,
      logsProcessedTime: logsProcessedTime - receiptsFetchTime,
      logsInsertTime: logsInsertTime - logsProcessedTime,
    },
    'Processed block',
  )

  parentPort?.postMessage({
    chainId,
    blockNumber,
  })
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
