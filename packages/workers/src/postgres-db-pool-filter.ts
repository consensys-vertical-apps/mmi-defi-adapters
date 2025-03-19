import {
  ChainName,
  EvmChain,
  type PoolFilter,
} from '@metamask-institutional/defi-adapters'
import pg from 'pg'
import type { Logger } from 'pino'
import { createDbPool } from './postgres-utils.js'

export function buildPostgresPoolFilter({
  dbUrl,
  logger,
}: {
  dbUrl: string
  logger?: Logger
}): PoolFilter {
  const dbPools = Object.values(EvmChain).reduce(
    (acc, chainId) => {
      const schema = ChainName[chainId]

      acc[chainId] = createDbPool({ dbUrl, schema, logger })

      return acc
    },
    {} as Record<EvmChain, pg.Pool>,
  )

  return async (userAddress: string, chainId: EvmChain) => {
    const res = await dbPools[chainId].query(
      `SELECT contract_address as contractAddress
         FROM logs
         WHERE address = $1`,
      [userAddress],
    )

    return (res.rows as { contractAddress: string }[]).map(
      ({ contractAddress }) => contractAddress,
    )
  }
}
