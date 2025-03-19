import pg from 'pg'
import type { Logger } from 'pino'

export function createDbPool({
  dbUrl,
  schema,
  logger,
  poolConfig,
}: {
  dbUrl: string
  schema: string
  logger?: Logger
  poolConfig?: Omit<pg.PoolConfig, 'connectionString'>
}) {
  const dbPool = new pg.Pool({
    connectionString: `${dbUrl}?options=-c%20search_path%3D${encodeURIComponent(
      schema,
    )}`,
    ...poolConfig,
  })

  dbPool.on('connect', (client) => {
    client.query(`SET search_path TO "${schema}"`)
  })

  const gracefulShutdown = async () => {
    try {
      logger?.info('Closing all database connections')
      await dbPool.end()
      logger?.info('All database connections closed')
    } catch (error) {
      logger?.error({ error }, 'Error during shutdown')
    } finally {
      process.exit(0)
    }
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
  process.on('exit', gracefulShutdown)

  return dbPool
}
