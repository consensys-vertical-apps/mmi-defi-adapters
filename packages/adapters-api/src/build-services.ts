import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { ChainName } from '@metamask-institutional/defi-adapters'
import { createDbPool } from '@metamask-institutional/workers'
import pg from 'pg'
import { NoDbService, PostgresService } from './db-service.js'
import { logger } from './logger.js'
import { buildMemoryUnwrapCacheProvider } from './memory-unwrap-price-cache-provider.js'

export function buildServices() {
  const unwrapCacheProvider = buildMemoryUnwrapCacheProvider()

  if (process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE !== 'true') {
    const dbService = new NoDbService()
    const defiProvider = new DefiProvider({
      unwrapCacheProvider,
    })

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
    poolFilter: dbService.getAddressChainPools.bind(dbService),
    unwrapCacheProvider,
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
