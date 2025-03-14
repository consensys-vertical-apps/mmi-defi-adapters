import { type EvmChain } from '@metamask-institutional/defi-adapters'
import type { Database } from 'better-sqlite3'
import { JsonRpcProvider, TransactionReceipt, ethers, getAddress } from 'ethers'
import { BlockRunner } from './block-runner.js'
import {
  insertLogs,
  selectAllWatchListKeys,
  updateLatestBlockProcessed,
} from './db-queries.js'
import { logger } from './logger.js'

export async function buildLatestCache(
  provider: JsonRpcProvider,
  chainId: EvmChain,
  db: Database,
  startBlock: number,
) {
  logger.info('Starting latest cache builder')

  const allWatchListKeys = selectAllWatchListKeys(db)

  const userIndexMap = new Map(
    allWatchListKeys.map(
      ({ contract_address, topic_0, user_address_index }) => [
        createWatchKey(contract_address, topic_0),
        user_address_index,
      ],
    ),
  )

  const indexer = new BlockRunner({
    provider,
    chainId,
    processBlockFn: async (blockNumber) =>
      processBlockFn({
        provider,
        blockNumber,
        userIndexMap,
        db,
      }),
    onError: async (latestSafeProcessedBlock: number) =>
      updateLatestBlockProcessed(db, latestSafeProcessedBlock),
  })

  await indexer.start(startBlock)
}

function createWatchKey(contract_address: string, topic_0: string): string {
  return `${contract_address.toLowerCase()}#${topic_0.toLowerCase()}`
}

async function processBlockFn({
  provider,
  blockNumber,
  userIndexMap,
  db,
}: {
  provider: JsonRpcProvider
  blockNumber: number
  userIndexMap: Map<string, number>
  db: Database
}): Promise<void> {
  const receipts = (await provider.send('eth_getBlockReceipts', [
    `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`, // some chains need to remove leading zeros like ftm
  ])) as TransactionReceipt[]

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

  insertLogs(db, logs, blockNumber)

  logger.info({ blockNumber, logsProcessed: logs.length }, 'Processed block')
}
