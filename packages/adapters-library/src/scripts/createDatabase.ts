import path from 'node:path'
import Database, { Database as BetterSqlite3Database } from 'better-sqlite3'

/**
 * Creates a database and ensures required tables exist.
 */
export function createDatabase(
  dbName: string,
  dbTables: Record<string, string>,
): BetterSqlite3Database {
  const dbPath = path.resolve(`./${dbName}`)
  const db = new Database(dbPath)

  // Create tables if they don't exist
  for (const [tableName, createTableQuery] of Object.entries(dbTables)) {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName)
    if (!tableExists) {
      console.log(`Creating table: ${tableName}`)
      db.exec(createTableQuery)
    }

    // check table created successfully
    const tableCreated = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(tableName)

    if (!tableCreated) {
      throw new Error(`Failed to create table: ${tableName}`)
    }
  }

  return db
}
