import {
  type EvmChain,
  type DefiProvider,
  type Chain,
  ChainName,
} from '@metamask-institutional/defi-adapters'

import type { CustomJsonRpcProvider } from '@metamask-institutional/defi-adapters/dist/core/provider/CustomJsonRpcProvider.js'
import { getAddress, ethers } from 'ethers'
import { BlockRunner } from './block-runner.js'
import type { Database as DatabaseType } from 'better-sqlite3'
import { createTable } from './db-queries.js'
import { logger } from './logger.js'

export async function buildLatestCache(
  chainId: EvmChain,
  defiProvider: DefiProvider,
  db: DatabaseType,
  startBlockOverride?: number,
) {
  const chainName = ChainName[chainId]
  logger.info(`Starting indexer for chain: ${chainName}`)

  const provider = defiProvider.chainProvider.providers[chainId]

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

export function createLatestTables(db: DatabaseType) {
  const tables: string[] = [
    `
                CREATE TABLE IF NOT EXISTS latest_block_processed (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    latest_block_processed INTEGER NOT NULL
                );
            `,
    `
            CREATE TABLE IF NOT EXISTS logs (
                contract_address CHAR(40) NOT NULL,
                address CHAR(40) NOT NULL,
                UNIQUE(contract_address, address)
            );
        `,
    `
        CREATE TABLE IF NOT EXISTS history_jobs (
          contract_address VARCHAR(40) NOT NULL,
          topic_0 TEXT NOT NULL,
          user_address_index INTEGER NOT NULL CHECK (user_address_index IN (1, 2, 3)),
          block_number INTEGER NOT NULL,
          PRIMARY KEY (contract_address, topic_0, user_address_index)
        );`,
  ]

  tables.forEach((table) => createTable(db, table))
}

async function getStartBlockNumberFn(
  db: DatabaseType,
  provider: CustomJsonRpcProvider,
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
  provider: CustomJsonRpcProvider
  blockNumber: number
  userIndexMap: Map<string, number>
  db: DatabaseType
}): Promise<void> {
  const receipts = await provider.send('eth_getBlockReceipts', [
    `0x${ethers.toBeHex(blockNumber)}`,
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

export function selectAllWatchListKeys(db: DatabaseType) {
  const unfinishedPools = db
    .prepare(`
        SELECT 	'0x' || contract_address as contract_address, topic_0, user_address_index
        FROM 	history_jobs
        `)
    .all() as {
    contract_address: string
    topic_0: string
    user_address_index: number
  }[]

  return unfinishedPools
}
