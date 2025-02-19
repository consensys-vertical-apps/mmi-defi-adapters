import path from 'node:path'
import {
  ChainName,
  DefiProvider,
  EvmChain,
} from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, Network } from 'ethers'
import { buildHistoricCache } from './build-historic-cache.js'
import {
  createDatabase,
  createHistoryTables,
  insertContractEntries,
} from './db-queries.js'
import { logger } from './logger.js'
import { buildLatestCache, createLatestTables } from './build-latest-cache.js'
const chainIdInput = process.argv[2]

if (!chainIdInput) {
  logger.error('Chain ID is required')
  process.exit(1)
}

const chainId = Number.parseInt(chainIdInput, 10) as EvmChain

if (!Object.values(EvmChain).includes(chainId)) {
  logger.error({ chainIdInput }, 'Invalid chain ID')
  process.exit(1)
}

const dbDirPath =
  process.env.DB_DIR_PATH ||
  path.resolve(import.meta.dirname, '../../../databases')

const historyDb = createDatabase(
  dbDirPath,
  `${ChainName[chainId]}_index_history`,
  {
    fileMustExist: false,
    readonly: false,
    timeout: 5000,
  },
)

const latestDb = createDatabase(
  dbDirPath,
  `${ChainName[chainId]}_index_latest`,
  {
    fileMustExist: false,
    readonly: false,
    timeout: 5000,
  },
)

const defiProvider = new DefiProvider()

const providerUrl =
  defiProvider.chainProvider.providers[chainId]._getConnection().url

const provider = new JsonRpcProvider(providerUrl, chainId, {
  staticNetwork: Network.from(chainId),
})

createHistoryTables(historyDb)
createLatestTables(latestDb)

// TODO:
// This should NOT be called here
// This should NOT be called in a loop for Script 1 and Script 2 separately
// This could be called as a separate process (cron job) to insert entries for all scripts
// This could be called whenever a new pool is added to the metadata DB
await insertContractEntries(defiProvider, chainId, historyDb)
await insertContractEntries(defiProvider, chainId, latestDb)

await Promise.all([
  buildHistoricCache(provider, chainId, historyDb),
  buildLatestCache(chainId, defiProvider, latestDb),
])
