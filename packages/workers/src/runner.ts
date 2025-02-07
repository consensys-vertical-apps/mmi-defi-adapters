import path from 'node:path'
import {
  DefiProvider,
  EvmChain,
  ChainName,
} from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, Network } from 'ethers'
import { createDatabase, insertContractEntries } from './db-queries.js'
import { buildHistoricCache } from './build-historic-cache.js'

const chainId = Number.parseInt(process.argv[2] ?? '1', 10) as EvmChain

const dbDirPath =
  process.env.DB_DIR_PATH ||
  path.resolve(import.meta.dirname, '../../../databases')

const db = createDatabase(dbDirPath, ChainName[chainId], {
  fileMustExist: false,
  readonly: false,
  timeout: 5000,
})

const defiProvider = new DefiProvider()

const providerUrl =
  defiProvider.chainProvider.providers[chainId]._getConnection().url

const provider = new JsonRpcProvider(providerUrl, chainId, {
  staticNetwork: Network.from(chainId),
})

// TODO:
// This should NOT be called here
// This should NOT be called in a loop for Script 1 and Script 2 separately
// This could be called as a separate process (cron job) to insert entries for all scripts
// This could be called whenever a new pool is added to the metadata DB
await insertContractEntries(defiProvider, chainId, db)

await buildHistoricCache(provider, chainId, db)
