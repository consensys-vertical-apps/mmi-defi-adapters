import path from 'node:path'
import type { DefiProvider } from '@metamask-institutional/defi-adapters'
import type { EvmChain } from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'
import type { PoolFilter } from '@metamask-institutional/defi-adapters/dist/tokenFilter.js'
import type { AdapterSettings } from '@metamask-institutional/defi-adapters/dist/types/adapter.js'
import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { logger } from './logger.js'

const historyCacheDbTables = {
  history_logs: `
        CREATE TABLE IF NOT EXISTS history_logs (
          address CHAR(40) NOT NULL,
          contract_address CHAR(40) NOT NULL,
          PRIMARY KEY (address, contract_address)
        );`,
  history_jobs: `
        CREATE TABLE IF NOT EXISTS history_jobs (
          contract_address VARCHAR(40) NOT NULL,
          topic_0 TEXT NOT NULL,
          user_address_index INTEGER NOT NULL CHECK (user_address_index IN (1, 2, 3)),
          block_number INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
          PRIMARY KEY (contract_address, topic_0, user_address_index)
        );`,
}

export function createHistoryTables(db: DatabaseType) {
  Object.values(historyCacheDbTables).forEach((table) => createTable(db, table))
}

function createDb(dbPath: string, dbOptions: Database.Options) {
  const db = new Database(dbPath, dbOptions)
  db.pragma('journal_mode = WAL')

  setCloseDatabaseHandlers(db)

  return db
}

export function createTable(db: DatabaseType, dbTable: string) {
  const tableExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(dbTable)

  if (!tableExists) {
    db.exec(dbTable)
  }
}

export function createDatabase(
  dbDirPath: string,
  dbName: string, // without .db
  dbOptions: Database.Options,
): DatabaseType {
  const dbPath = path.resolve(dbDirPath, `${dbName}.db`)
  const db = createDb(dbPath, dbOptions)

  return db
}

export function setCloseDatabaseHandlers(db: DatabaseType) {
  const closeDatabase = () => db.close()

  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Closing database connection...')
    closeDatabase()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Closing database connection...')
    closeDatabase()
    process.exit(0)
  })

  process.on('exit', () => {
    closeDatabase()
  })
}

export function fetchNextPoolsToProcess(db: DatabaseType) {
  const unfinishedPools = db
    .prepare(`
        SELECT 	'0x' || contract_address as contract_address, topic_0, user_address_index, block_number, status
        FROM 	history_jobs
        WHERE 	status <> 'completed'
        `)
    .all() as {
    contract_address: string
    topic_0: string
    user_address_index: number
    block_number: number
    status: 'pending' | 'failed'
  }[]

  return unfinishedPools
}

export function insertLogs(db: DatabaseType, logsToInsert: [string, string][]) {
  const logEntryStmt = db.prepare(
    'INSERT OR IGNORE INTO history_logs (address, contract_address) VALUES (?, ?)',
  )

  db.transaction(() => {
    for (const [contractAddress, address] of logsToInsert) {
      logEntryStmt.run(address, contractAddress)
    }
  })()
}

export function completeJobs(
  db: DatabaseType,
  contractAddresses: string[],
  topic0: string,
  userAddressIndex: number,
) {
  const jobStmt = db.prepare(
    `UPDATE history_jobs SET status = 'completed' WHERE contract_address = ? AND topic_0 = ? AND user_address_index = ?`,
  )

  db.transaction(() => {
    for (const contractAddress of contractAddresses) {
      jobStmt.run(contractAddress.slice(2), topic0, userAddressIndex)
    }
  })()
}

export function failJobs(
  db: DatabaseType,
  contractAddresses: string[],
  topic0: string,
  userAddressIndex: number,
) {
  const jobStmt = db.prepare(
    `UPDATE history_jobs SET status = 'failed' WHERE contract_address = ? AND topic_0 = ? AND user_address_index = ?`,
  )

  db.transaction(() => {
    for (const contractAddress of contractAddresses) {
      jobStmt.run(contractAddress.slice(2), topic0, userAddressIndex)
    }
  })()
}

export async function insertContractEntries(
  defiProvider: DefiProvider,
  chainId: EvmChain,
  db: DatabaseType,
) {
  const provider = defiProvider.chainProvider.providers[chainId]

  const currentBlockNumber = await provider.getBlockNumber()

  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  const protocolTokenEntries = new Set<string>()
  for (const adapterSupportArray of Object.values(defiPoolAddresses || {})) {
    for (const adapterSupport of adapterSupportArray) {
      if (!adapterSupport.userEvent) {
        continue
      }

      for (const address of adapterSupport.protocolTokenAddresses?.[chainId] ||
        []) {
        if (!adapterSupport.userEvent) {
          continue
        }

        const event =
          adapterSupport.userEvent === 'Transfer'
            ? '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef#2'
            : `${adapterSupport.userEvent.topic0}#${adapterSupport.userEvent.userAddressIndex}`

        protocolTokenEntries.add(`${address.slice(2)}#${event}`)
      }
    }
  }

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO history_jobs (contract_address, topic_0, user_address_index, block_number) VALUES (?, ?, ?, ?)',
  )

  const transaction = db.transaction(
    (protocolTokenEntries: string[], currentBlockNumber: number) => {
      protocolTokenEntries.forEach((protocolTokenEntry) => {
        const [address, topic0, userAddressIndex] =
          protocolTokenEntry.split('#')
        stmt.run(address, topic0, userAddressIndex, currentBlockNumber)
      })
    },
  )

  transaction(Array.from(protocolTokenEntries), currentBlockNumber)
}

export function buildCachePoolFilter(
  dbs: Partial<Record<EvmChain, DatabaseType>>,
): PoolFilter {
  return async (
    userAddress: string,
    chainId: EvmChain,
    adapterSettings: AdapterSettings,
  ): Promise<string[] | undefined> => {
    const db = dbs[chainId]
    if (!db || adapterSettings.userEvent === false) {
      return undefined
    }

    const pendingPools = db
      .prepare(`
        SELECT 	contract_address
        FROM 	history_logs
        WHERE 	address = ?
        `)
      .all(userAddress.slice(2)) as {
      contract_address: string
    }[]

    return pendingPools.map((pool) => `0x${pool.contract_address}`)
  }
}
