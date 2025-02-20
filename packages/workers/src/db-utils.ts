import path from 'node:path'
import Database, { type Database as DatabaseType } from 'better-sqlite3'
import { logger } from './logger.js'

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
): DatabaseType {
  const dbPath = path.resolve(dbDirPath, `${dbName}.db`)

  const db = new Database(dbPath, dbOptions)

  db.pragma('journal_mode = WAL')

  setCloseDatabaseHandlers(db)

  return db
}

/**
 * Creates a table in the database if it does not exist
 * @param db - The database instance
 * @param dbTable - The name of the table to create
 */
export function createTable(db: DatabaseType, dbTable: string) {
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
export function setCloseDatabaseHandlers(db: DatabaseType) {
  const closeDatabase = () => db.close()

  process.on('SIGINT', () => {
    logger.info('Received SIGINT. Closing database connection.')
    closeDatabase()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Closing database connection.')
    closeDatabase()
    process.exit(0)
  })

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception. Closing database connection.')
    closeDatabase()
    process.exit(1)
  })

  process.on('unhandledRejection', () => {
    logger.error('Unhandled Rejection. Closing database connection.')
    closeDatabase()
    process.exit(1)
  })

  process.on('exit', () => {
    closeDatabase()
  })
}
