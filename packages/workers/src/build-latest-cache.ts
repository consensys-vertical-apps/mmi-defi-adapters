import { type EvmChain } from '@metamask-institutional/defi-adapters'
import {
  Interface,
  JsonRpcProvider,
  TransactionReceipt,
  ZeroAddress,
  ethers,
  getAddress,
} from 'ethers'
import type { Logger } from 'pino'
import { BlockRunner } from './block-runner.js'
import { parseLog } from './event-parsing.js'
import type { CacheClient } from './postgres-cache-client.js'

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
        provider,
        blockNumber,
        userIndexMap,
        cacheClient,
        logger,
      }),
    onError: async (latestSafeProcessedBlock: number) =>
      cacheClient.updateLatestBlockProcessed(latestSafeProcessedBlock),
    logger,
  })

  await indexer.start()
}

function createWatchKey(contractAddress: string, topic0: string): string {
  return `${contractAddress.toLowerCase()}#${topic0.toLowerCase()}`
}

async function processBlockFn({
  provider,
  blockNumber,
  userIndexMap,
  cacheClient,
  logger,
}: {
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
  const receipts = (await provider.send('eth_getBlockReceipts', [
    `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`, // some chains need to remove leading zeros like ftm
  ])) as TransactionReceipt[]

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
        const userAddress = parseLog(log, eventAbi, userAddressIndex)

        if (userAddress) {
          logs.push({
            address: userAddress,
            contractAddress,
          })
        }
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
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
}
