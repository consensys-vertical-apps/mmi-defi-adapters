import { config } from 'node:process'
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
  const maxPoolSize = poolConfig?.max || 10 // default is 10

  const dbPool = new pg.Pool({
    connectionString: `${dbUrl}?options=-c%20search_path%3D${encodeURIComponent(
      schema,
    )}`,
    ...poolConfig,
  })

  dbPool.on('error', (err) => {
    logger?.error({ err }, 'Database connection error')
  })

  dbPool.on('connect', (client) => {
    client.query(`SET search_path TO "${schema}"`).catch((err) => {
      logger?.error({ err, schema }, 'Failed to set search path schema')
    })
  })

  const connectionMonitor = setInterval(() => {
    const numClients = dbPool.totalCount
    const numIdle = dbPool.idleCount
    const numUsed = numClients - numIdle

    if (numUsed > maxPoolSize * 0.8) {
      // Alert at 80% capacity
      logger?.warn(
        { numUsed, numIdle, max: maxPoolSize },
        'Database connection pool nearing capacity',
      )
    }

    logger?.info(
      { numUsed, numIdle, max: maxPoolSize },
      'Connection pool status',
    )
  }, 30000)

  const gracefulShutdown = async () => {
    clearInterval(connectionMonitor)
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
