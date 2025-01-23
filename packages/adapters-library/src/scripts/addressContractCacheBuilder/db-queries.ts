import Database from 'better-sqlite3'
import path from 'node:path'
import { DefiProvider } from '../../defiProvider'
import { EvmChain } from '../../core/constants/chains'

const tables = {
  history_logs: `
      CREATE TABLE IF NOT EXISTS history_logs (
        address CHAR(40) NOT NULL,
        contract_address CHAR(40) NOT NULL,
        PRIMARY KEY (address, contract_address)
      );`,
  history_jobs: `
      CREATE TABLE IF NOT EXISTS history_jobs (
        contract_address VARCHAR(40) NOT NULL,
        block_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
        PRIMARY KEY (contract_address)
      );`,
}

function createDb(chainName: string, dbName: string) {
  const dbPath = path.resolve(`./${chainName}_${dbName}.db`)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  // db.pragma('synchronous = NORMAL')
  return db
}

function createTable(db: Database.Database, dbTable: string) {
  const tableExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(dbTable)

  if (!tableExists) {
    db.exec(dbTable)
  }
}

export function createDatabase(chainName: string): Database.Database {
  const db = createDb(chainName, 'history')

  for (const table of Object.values(tables)) {
    createTable(db, table)
  }

  return db
}

export function fetchNextPoolsToProcess(db: Database.Database):
  | {
      poolAddresses: string[]
      targetBlockNumber: number
    }
  | undefined {
  const pendingPools = db
    .prepare(`
        SELECT 	contract_address, block_number
        FROM 	history_jobs
        WHERE 	status <> 'completed'
        `)
    .all() as {
    contract_address: string
    block_number: number
  }[]

  if (pendingPools.length === 0) {
    return undefined
  }

  return {
    poolAddresses: pendingPools.map((pool) => `0x${pool.contract_address}`),
    targetBlockNumber: pendingPools[0]!.block_number,
  }
}

export function insertLogs(
  db: Database.Database,
  logsToInsert: [string, string][],
) {
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
  db: Database.Database,
  contractAddresses: string[],
) {
  const jobStmt = db.prepare(
    `UPDATE history_jobs SET status = 'completed' WHERE contract_address = ?`,
  )

  db.transaction(() => {
    for (const contractAddress of contractAddresses) {
      jobStmt.run(contractAddress.slice(2))
    }
  })()
}

// TODO: This script should not be responsible for inserting the contract entries
export async function insertContractEntries(
  defiProvider: DefiProvider,
  chainId: EvmChain,
  db: Database.Database,
) {
  const provider = defiProvider.chainProvider.providers[chainId]

  const currentBlockNumber = await provider.getBlockNumber()

  const defiPoolAddresses = await defiProvider.getSupport({
    filterChainIds: [chainId],
  })

  const protocolTokenAddresses = new Set<string>()
  for (const adapterSupportArray of Object.values(defiPoolAddresses || {})) {
    for (const adapterSupport of adapterSupportArray) {
      if (!adapterSupport.includeInEventProcessing) {
        continue
      }

      for (const address of adapterSupport.protocolTokenAddresses?.[chainId] ||
        []) {
        protocolTokenAddresses.add(address.slice(2))
      }
    }
  }

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO history_jobs (contract_address, block_number) VALUES (?, ?)',
  )

  const transaction = db.transaction(
    (contractAddresses: string[], currentBlockNumber: number) => {
      contractAddresses.forEach((address) => {
        stmt.run(address, currentBlockNumber)
      })
    },
  )

  transaction(Array.from(protocolTokenAddresses), currentBlockNumber)
}
