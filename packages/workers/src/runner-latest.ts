import path from 'node:path'
import {
  ChainName,
  DefiProvider,
  EvmChain,
} from '@metamask-institutional/defi-adapters'

import { createDatabase, insertContractEntries } from './db-queries.js'

import { buildLatestCache, createLatestTables } from './build-latest-cache.js'

const dbDirPath =
  process.env.DB_DIR_PATH ||
  path.resolve(import.meta.dirname, '../../../databases')
const defiProvider = new DefiProvider()

await Promise.all(
  Object.values(EvmChain).map(async (chainId) => {
    const db = createDatabase(dbDirPath, `${ChainName[chainId]}_index_latest`, {
      fileMustExist: false,
      readonly: false,
      timeout: 5000,
    })

    createLatestTables(db)

    // TODO: Have parameters to determine what pools to insert
    await insertContractEntries(defiProvider, chainId, db)

    buildLatestCache(chainId, defiProvider, db)
  }),
)
