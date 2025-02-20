import {
  ChainName,
  type DefiProvider,
  type EvmChain,
} from '@metamask-institutional/defi-adapters'
import type { Database as DatabaseType } from 'better-sqlite3'
import { ethers, getAddress, JsonRpcProvider } from 'ethers'
import { BlockRunner } from './block-runner.js'
import { logger } from './logger.js'
import { selectAllWatchListKeys } from './db-tables.js'

export async function buildLatestCache(
  provider: JsonRpcProvider,
  chainId: EvmChain,
  db: DatabaseType,
  startBlockOverride?: number,
) {
  const chainName = ChainName[chainId]
  logger.info(`Starting indexer for chain: ${chainName}`)

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
    getStartBlockNumberFn: () => getStartBlockNumberFn(db, provider),
    processBlockFn: async (blockNumber) =>
      processBlockFn({
        provider,
        blockNumber,
        userIndexMap,
        db,
      }),
    onError: async (latestSafeProcessedBlock: number) =>
      onError(latestSafeProcessedBlock, db),
  })

  await indexer.start(startBlockOverride)
}

function createWatchKey(contract_address: string, topic_0: string): string {
  return `${contract_address.toLowerCase()}#${topic_0.toLowerCase()}`
}

async function getStartBlockNumberFn(
  db: DatabaseType,
  provider: JsonRpcProvider,
  startBlockOverride?: number,
): Promise<number> {
  if (startBlockOverride) {
    return startBlockOverride
  }

  const lastPrcessedBlock = (
    db
      .prepare('SELECT latest_block_processed FROM latest_block_processed')
      .get() as { latest_block_processed?: number } | undefined
  )?.latest_block_processed

  if (lastPrcessedBlock) {
    return lastPrcessedBlock
  }

  const latestBlockNumber = await provider.getBlockNumber()

  return latestBlockNumber
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
  db: DatabaseType
}): Promise<void> {
  const receipts = await provider.send('eth_getBlockReceipts', [
    `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`, // some chains need to remove leading zeros like ftm
  ])

  const queries: string[] = []

  for (const receipt of receipts?.flat() || []) {
    for (const log of receipt.logs || []) {
      // retuned lowercase from provider
      const contractAddressLowercase = log.address
      const topic0 = log.topics[0]

      if (!topic0) {
        continue
      }

      const key = createWatchKey(contractAddressLowercase, topic0)

      if (userIndexMap.has(key)) {
        const userIndex = userIndexMap.get(key)!

        const paddedUserAddress = log.topics[userIndex]

        const userAddress = getAddress(
          paddedUserAddress.slice(-40).toLowerCase(),
        ).slice(2)

        // Skip the zero address
        if (userAddress === '0000000000000000000000000000000000000000') {
          continue
        }

        queries.push(
          `INSERT OR IGNORE INTO logs (contract_address, address) VALUES ('${getAddress(
            contractAddressLowercase,
          ).slice(2)}', '${userAddress}');`,
        )
      }
    }
  }

  db.transaction(() => {
    queries.forEach((insert: string) => db.prepare(insert).run())
    db.prepare(
      'INSERT OR REPLACE INTO latest_block_processed (id, latest_block_processed) VALUES (1, ?)',
    ).run(blockNumber)
  })()
}

async function onError(latestSafeProcessedBlock: number, db: DatabaseType) {
  db.prepare(
    'INSERT OR REPLACE INTO latest_block_processed (id, latest_block_processed) VALUES (1, ?)',
  ).run(latestSafeProcessedBlock)
}
