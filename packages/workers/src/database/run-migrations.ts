import fs from 'node:fs/promises'
import path from 'node:path'
import type { Pool } from 'pg'
import type { Logger } from 'pino'

export async function runMigrations(pool: Pool, logger: Logger) {
  const client = await pool.connect()

  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS migrations (
         name VARCHAR(255) NOT NULL PRIMARY KEY,
         applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )`,
    )

    const { rows } = await client.query<{ name: string }>(
      'SELECT name FROM migrations',
    )

    const migrationsApplied = rows.map((row) => row.name)

    const migrations = (
      await fs.readdir(path.join(import.meta.dirname, 'migrations'))
    )
      .filter(
        (file) =>
          /^\d{4}-.+\.js$/.test(file) &&
          !migrationsApplied.some((appliedMigration) =>
            file.includes(appliedMigration),
          ),
      )
      .sort()

    if (migrations.length === 0) {
      logger.info('No migrations to apply')
      return
    }

    for (const file of migrations) {
      const module = await import(`./migrations/${file}`)
      const migrationName = path.parse(file).name

      try {
        await client.query('BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED')

        await module.default(client)

        await client.query('INSERT INTO migrations (name) VALUES ($1)', [
          migrationName,
        ])

        await client.query('COMMIT')

        logger.info({ migrationName }, 'Applied migration')
      } catch (error) {
        await client.query('ROLLBACK')

        logger.error({ migrationName }, 'Error applying migration')
        throw error
      }
    }

    logger.info('All migrations completed')
  } catch (error) {
    logger.error({ error }, 'Error running migrations')
    throw error
  } finally {
    client.release()
  }
}
