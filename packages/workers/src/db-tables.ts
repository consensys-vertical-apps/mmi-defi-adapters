import type { Database } from 'better-sqlite3'

export const dbTables = {
  logs: `
    CREATE TABLE IF NOT EXISTS logs (
      address CHAR(40) NOT NULL,
      contract_address CHAR(40) NOT NULL,
      PRIMARY KEY (address, contract_address)
    )`,
  jobs: `
    CREATE TABLE IF NOT EXISTS jobs (
      contract_address VARCHAR(40) NOT NULL,
      topic_0 TEXT NOT NULL,
      user_address_index INTEGER NOT NULL CHECK (user_address_index IN (1, 2, 3)),
      block_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
      PRIMARY KEY (contract_address, topic_0, user_address_index)
    )`,
  latest_block_processed: `
    CREATE TABLE IF NOT EXISTS latest_block_processed (
      id INTEGER PRIMARY KEY DEFAULT 1,
      latest_block_processed INTEGER NOT NULL
    )`,
}

type LogDbEntry = {
  address: string
  contract_address: string
}

type JobDbEntry = {
  contract_address: string
  topic_0: string
  user_address_index: number
  block_number: number
  status: 'pending' | 'failed'
}

export function fetchUnfinishedJobs(db: Database) {
  return db
    .prepare(`
      SELECT  '0x' || contract_address as contract_address,
              topic_0,
              user_address_index,
              block_number,
              status
      FROM    jobs
      WHERE   status <> 'completed'`)
    .all() as JobDbEntry[]
}

export function selectAllWatchListKeys(db: Database) {
  return db
    .prepare(`
      SELECT  '0x' || contract_address as contract_address,
              topic_0,
              user_address_index
      FROM    jobs`)
    .all() as Pick<
    JobDbEntry,
    'contract_address' | 'topic_0' | 'user_address_index'
  >[]
}

export function insertLogs(db: Database, logsToInsert: [string, string][]) {
  const logEntryStmt = db.prepare(
    'INSERT OR IGNORE INTO logs (address, contract_address) VALUES (?, ?)',
  )

  db.transaction(() => {
    for (const [contractAddress, address] of logsToInsert) {
      logEntryStmt.run(address, contractAddress)
    }
  })()
}

export function updateJobStatus(
  db: Database,
  contractAddresses: string[],
  topic0: string,
  userAddressIndex: number,
  status: 'completed' | 'failed',
) {
  const jobStmt = db.prepare(
    'UPDATE jobs SET status = ? WHERE contract_address = ? AND topic_0 = ? AND user_address_index = ?',
  )

  db.transaction(() => {
    for (const contractAddress of contractAddresses) {
      jobStmt.run(status, contractAddress.slice(2), topic0, userAddressIndex)
    }
  })()
}
