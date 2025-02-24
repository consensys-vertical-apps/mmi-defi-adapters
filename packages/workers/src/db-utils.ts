import path from 'node:path'
import Database from 'better-sqlite3'
import { logger } from './logger.js'
import {
  ChainName,
  EvmChain,
  type PoolFilter,
} from '@metamask-institutional/defi-adapters'
import { getAllUserPools } from './db-queries.js'

/**
 * Returns a new or existing database instance
 * @param dbDirPath - The directory path to the database file
 * @param dbName - The name of the database file (without the .db extension)
 * @param dbOptions - The options to pass to the database instance
 * @returns A new or existing database instance
 */
export function createDatabase(
  dbDirPath: string,
  dbName: string,
  dbOptions: Database.Options,
): Database.Database {
  const dbPath = path.resolve(dbDirPath, `${dbName}.db`)

  const db = new Database(dbPath, dbOptions)

  db.pragma('journal_mode = WAL')

  setCloseDatabaseHandlers([db])

  return db
}

/**
 * Creates a table in the database if it does not exist
 * @param db - The database instance
 * @param dbTable - The name of the table to create
 */
export function createTable(db: Database.Database, dbTable: string) {
  const tableExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(dbTable)

  if (!tableExists) {
    db.exec(dbTable)
  }
}

/**
 * Sets up handlers for SIGINT, SIGTERM, and exit events to close the database connection
 * @param db - The database instance
 */
export function setCloseDatabaseHandlers(dbs: Database.Database[]) {
  const closeDatabases = () => dbs.forEach((db) => db.close())

  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Closing database connection.')
    closeDatabases()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Closing database connection.')
    closeDatabases()
    process.exit(0)
  })

  process.on('uncaughtException', (error) => {
    logger.error(error, 'Uncaught Exception. Closing database connection.')
    closeDatabases()
    process.exit(1)
  })

  process.on('unhandledRejection', (error) => {
    logger.error(error, 'Unhandled Rejection. Closing database connection.')
    closeDatabases()
    process.exit(1)
  })

  process.on('exit', () => {
    closeDatabases()
  })
}

export function buildDbPoolFilter(): PoolFilter {
  const dbs = Object.values(EvmChain).reduce(
    (acc, chainId) => {
      const db = new Database(
        path.resolve(`databases/${ChainName[chainId]}_index.db`),
        {
          readonly: true,
          fileMustExist: true,
          timeout: 5000,
        },
      )

      acc[chainId] = db

      return acc
    },
    {} as Record<EvmChain, Database.Database>,
  )

  setCloseDatabaseHandlers(Object.values(dbs))

  return async (userAddress: string, chainId: EvmChain) => {
    const db = dbs[chainId]
    if (!db) {
      throw new Error(`Database not found for chain ${chainId}`)
    }

    return getAllUserPools(db, userAddress)
  }
}
