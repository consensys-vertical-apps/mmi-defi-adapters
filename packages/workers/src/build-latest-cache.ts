import { type EvmChain } from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, TransactionReceipt, ethers, getAddress } from 'ethers'
import type { Logger } from 'pino'
import { BlockRunner } from './block-runner.js'
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
    allJobs.map(({ contractAddress, topic0, userAddressIndex }) => [
      createWatchKey(contractAddress, topic0),
      userAddressIndex,
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
  userIndexMap: Map<string, number>
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
      // retuned lowercase from provider
      const contractAddress = getAddress(log.address)
      const topic0 = log.topics[0]

      if (!topic0) {
        continue
      }

      const userAddressIndex = userIndexMap.get(
        createWatchKey(contractAddress, topic0),
      )

      if (userAddressIndex) {
        const topic = log.topics[userAddressIndex]!

        if (
          topic.startsWith('0x000000000000000000000000') && // Not an address if it is does not start with 0x000000000000000000000000
          topic !==
            '0x0000000000000000000000000000000000000000000000000000000000000000' // Skip the zero address
        ) {
          const topicAddress = getAddress(`0x${topic.slice(-40).toLowerCase()}`)

          logs.push({
            address: topicAddress,
            contractAddress,
          })
        }
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
