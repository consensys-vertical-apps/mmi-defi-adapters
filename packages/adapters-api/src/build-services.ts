import { DefiProvider, EvmChain } from '@codefi/defi-adapters'
import { ChainName } from '@codefi/defi-adapters'
import { createDbPool } from '@metamask-institutional/workers'
import pg from 'pg'
import { NoDbService, PostgresService } from './db-service.js'
import { logger } from './logger.js'

export function buildServices() {
  if (process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE !== 'true') {
    const dbService = new NoDbService()
    const defiProvider = new DefiProvider()

    return {
      dbService,
      defiProvider,
    }
  }

  if (!process.env.CACHE_DATABASE_URL) {
    throw new Error('CACHE_DATABASE_URL is not set')
  }

  const dbService = new PostgresService(buildDbPools())
  const defiProvider = new DefiProvider({
    getDefiPositionsDetection:
      dbService.getDefiPositionsDetection.bind(dbService),
  })

  return {
    dbService,
    defiProvider,
  }
}

let storedDbPools: Record<EvmChain, pg.Pool> | undefined
function buildDbPools() {
  if (!process.env.CACHE_DATABASE_URL) {
    throw new Error('CACHE_DATABASE_URL is not set')
  }

  if (storedDbPools) {
    return storedDbPools
  }

  const dbPools = Object.values(EvmChain).reduce(
    (acc, chainId) => {
      const schema = ChainName[chainId]

      acc[chainId] = createDbPool({
        dbUrl: process.env.CACHE_DATABASE_URL!,
        schema,
        logger: logger.child({ chainId }),
      })

      return acc
    },
    {} as Record<EvmChain, pg.Pool>,
  )

  storedDbPools = dbPools

  return storedDbPools
}
