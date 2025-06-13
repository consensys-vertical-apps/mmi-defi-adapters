import pg from 'pg'
import type { Logger } from 'pino'

const THIRTY_SECONDS = 30_000

export function createDbPool({
  dbUrl,
  schema,
  logger,
  partialPoolConfig,
}: {
  dbUrl: string
  schema: string
  logger?: Logger
  partialPoolConfig?: Omit<pg.PoolConfig, 'connectionString'>
}) {
  const poolConfig = {
    connectionString: `${dbUrl}?options=-c%20search_path%3D${encodeURIComponent(
      schema,
    )}`,
    max: 10,
    ssl: process.env.CACHE_DATABASE_DISABLE_SSL
      ? false
      : {
          rejectUnauthorized: false,
        },
    ...partialPoolConfig,
  }

  const dbPool = new pg.Pool(poolConfig)

  dbPool.on('error', (err) => {
    const errorMessage = err?.message || 'Unknown error'
    const errorStack = err?.stack || 'No stack trace'
    logger?.error(
      {
        errorMessage,
        errorStack,
        poolStatus: {
          totalCount: dbPool.totalCount,
          idleCount: dbPool.idleCount,
          waitingCount: dbPool.waitingCount,
        },
      },
      'Database connection error',
    )
  })

  dbPool.on('connect', (client) => {
    client.query(`SET search_path TO "${schema}"`).catch((err) => {
      logger?.error({ err, schema }, 'Failed to set search path schema')
    })
  })

  const connectionMonitor = setInterval(() => {
    const numClients = dbPool.totalCount
    const numIdle = dbPool.idleCount
    const numWaiting = dbPool.waitingCount
    const numUsed = numClients - numIdle

    if (numWaiting > 0) {
      logger?.warn(
        { numUsed, numIdle, numWaiting, max: poolConfig.max },
        'Tasks waiting for database connections',
      )
    }

    if (numUsed > poolConfig.max * 0.8) {
      logger?.warn(
        { numUsed, numIdle, numWaiting, max: poolConfig.max },
        'Database connection pool nearing capacity',
      )
    }

    logger?.debug(
      { numUsed, numIdle, numWaiting, max: poolConfig.max },
      'Connection pool status',
    )
  }, THIRTY_SECONDS)

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
