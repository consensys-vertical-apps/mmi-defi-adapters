import { buildPostgresPoolFilter } from '@metamask-institutional/workers'
import { logger } from './logger.js'

export function buildPoolFilter() {
  if (process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE !== 'true') {
    return undefined
  }

  if (!process.env.CACHE_DATABASE_URL) {
    throw new Error('CACHE_DATABASE_URL is not set')
  }

  return buildPostgresPoolFilter({
    dbUrl: process.env.CACHE_DATABASE_URL,
    logger,
  })
}
