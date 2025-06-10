import { parentPort } from 'node:worker_threads'
import { type EvmChain } from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, TransactionReceipt, ethers, getAddress } from 'ethers'
import type { Logger } from 'pino'
import { BlockRunner } from './block-runner.js'
import { extractErrorMessage } from './utils/extractErrorMessage.js'
import { parseUserEventLog } from './parse-user-event-log.js'
import type { CacheClient } from './postgres-cache-client.js'
import { withTimeout } from './utils/with-timeout.js'

export async function buildLatestCache(
  provider: JsonRpcProvider,
  chainId: EvmChain,
  cacheClient: CacheClient,
  startBlock: number,
  logger: Logger,
) {
  logger.info('Starting latest cache builder')

  const allJobs = await cacheClient.fetchAllJobs()

  const userIndexMap = new Map(
    allJobs.map(({ contractAddress, topic0, userAddressIndex, eventAbi }) => [
      createWatchKey(contractAddress, topic0),
      { userAddressIndex, eventAbi },
    ]),
  )

  const indexer = new BlockRunner({
    processingBlockNumber: startBlock,
    provider,
    chainId,
    processBlockFn: async (blockNumber) =>
      processBlockFn({
        chainId,
        provider,
        blockNumber,
        userIndexMap,
        cacheClient,
        logger,
      }),
    onError: async (latestSafeProcessedBlock: number) => {
      logger.info(
        { latestSafeProcessedBlock },
        'Rewinding latest safe processing block',
      )
      await cacheClient.updateLatestBlockProcessed(latestSafeProcessedBlock)
    },
    logger,
  })

  await indexer.start()
}

function createWatchKey(contractAddress: string, topic0: string): string {
  return `${contractAddress.toLowerCase()}#${topic0.toLowerCase()}`
}

async function processBlockFn({
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
