import type {
  EvmChain,
  DefiProvider,
  Chain,
} from '@metamask-institutional/defi-adapters'
import { ChainIdToChainNameMap } from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'
import type { CustomJsonRpcProvider } from '@metamask-institutional/defi-adapters/dist/core/provider/CustomJsonRpcProvider.js'
import { getAddress, ethers } from 'ethers'
import { BlockRunner } from './block-indexer.js'
import type { Database as DatabaseType } from 'better-sqlite3'
import { createTable } from './db-queries.js'
import { logger } from './logger.js'

export async function buildLatestCache(
  chainId: EvmChain,
  defiProvider: DefiProvider,
  db: DatabaseType,
  startBlockOverride?: number,
) {
  const chainName = ChainIdToChainNameMap[chainId]
  logger.info(`Starting indexer for chain: ${chainName}`)

  const provider = defiProvider.chainProvider.providers[chainId]

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
            CREATE TABLE IF NOT EXISTS contract_start_block (
                contract_address CHAR(40) NOT NULL,
                first_block_number INTEGER NOT NULL,
                PRIMARY KEY (contract_address)
            );
        `,
  ]

  tables.forEach((table) => createTable(db, table))

  const watchContractListCheckSum = await getDeFiContractAddressesCheckSum({
    defiProvider,
    chainId,
    chainName,
  })

  // if block override is set, replace all start blocks with the override value
  if (startBlockOverride) {
    db.exec(
      Array.from(watchContractListCheckSum)
        .map(
          (address) =>
            `INSERT OR REPLACE INTO contract_start_block (contract_address, first_block_number) VALUES ('${address}', ${startBlockOverride});`,
        )
        .join('\n'),
    )

    db.prepare(
      'INSERT OR REPLACE INTO latest_block_processed (id, latest_block_processed) VALUES (1, ?)',
    ).run(startBlockOverride)
  } else {
    const lastProcessedBlockNumber = await getStartBlockNumberFn(db, provider)
    db.exec(
      Array.from(watchContractListCheckSum)
        .map(
          (address) =>
            `INSERT OR IGNORE INTO contract_start_block (contract_address, first_block_number) VALUES ('${address}', ${lastProcessedBlockNumber});`,
        )
        .join('\n'),
    )
  }

  const indexer = new BlockRunner({
    provider,
    chainId,
    getStartBlockNumberFn: () => getStartBlockNumberFn(db, provider),
    processBlockFn: async (blockNumber) =>
      processBlockFn({
        provider,
        blockNumber,
        watchContractListLowercase: new Set(
          Array.from(watchContractListCheckSum).map((address) =>
            address.toLowerCase(),
          ),
        ),
        db,
      }),
    onError: async (latestSafeProcessedBlock: number) =>
      onError(latestSafeProcessedBlock, db),
  })

  await indexer.start()
}

async function getDeFiContractAddressesCheckSum({
  defiProvider,
  chainId,
  chainName,
}: { defiProvider: DefiProvider; chainId: Chain; chainName: string }) {
  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  const watchContractList = new Set<string>()
  for (const pools of Object.values(defiPoolAddresses || {})) {
    for (const pool of pools) {
      for (const address of pool.protocolTokenAddresses?.[chainId] || []) {
        watchContractList.add(getAddress(address).slice(2))
      }
    }
  }

  logger.info(
    `Watching ${watchContractList.size} DeFi contracts on ${chainName}`,
  )
  return watchContractList
}

async function getStartBlockNumberFn(
  db: DatabaseType,
  provider: CustomJsonRpcProvider,
): Promise<number> {
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
  watchContractListLowercase,
  db,
}: {
  provider: CustomJsonRpcProvider
  blockNumber: number
  watchContractListLowercase: Set<string>
  db: DatabaseType
}): Promise<void> {
  const receipts = await provider.send('eth_getBlockReceipts', [
    `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`,
  ])

  const queries: string[] = []

  for (const receipt of receipts?.flat() || []) {
    for (const log of receipt.logs || []) {
      // retuned lowercase from provider
      const contractAddressLowercase = log.address
      if (watchContractListLowercase.has(contractAddressLowercase.slice(2))) {
        log.topics
          .filter((topic: string) =>
            topic.startsWith('0x000000000000000000000000'),
          )
          .forEach((topic: string) =>
            queries.push(
              `INSERT OR IGNORE INTO logs (contract_address, address) VALUES ('${getAddress(
                contractAddressLowercase,
              ).slice(2)}', '${getAddress(topic.slice(-40).toLowerCase()).slice(
                2,
              )}');`,
            ),
          )
      }
    }
  }

  db.transaction((inserts) => {
    inserts.forEach((insert: string) => db.prepare(insert).run())
    db.prepare(
      'INSERT OR REPLACE INTO latest_block_processed (id, latest_block_processed) VALUES (1, ?)',
    ).run(blockNumber)
  })(queries)
}

async function onError(latestSafeProcessedBlock: number, db: DatabaseType) {
  db.prepare(
    'INSERT OR REPLACE INTO latest_block_processed (id, latest_block_processed) VALUES (1, ?)',
  ).run(latestSafeProcessedBlock)

  throw new Error(`Error processing block: ${latestSafeProcessedBlock}`)
}
