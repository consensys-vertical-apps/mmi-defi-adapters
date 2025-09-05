import {
  ChainName,
  EvmChain,
  type DefiPositionDetection,
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
}): DefiPositionDetection {
  const dbPools = Object.values(EvmChain).reduce(
    (acc, chainId) => {
      const schema = ChainName[chainId]

      acc[chainId] = createDbPool({
        dbUrl,
        schema,
        logger: logger ? logger.child({ chainId }) : undefined,
      })

      return acc
    },
    {} as Record<EvmChain, pg.Pool>,
  )

  return async (userAddress: string, chainId: EvmChain) => {
    const res = await dbPools[chainId].query(
      `SELECT contract_address as "contractAddress", metadata_key, metadata_value
         FROM logs
         WHERE address = $1`,
      [userAddress],
    )

    const contractAddresses = new Set<string>()
    const tokenIds: Record<string, string[]> = {}

    for (const row of res.rows) {
      const { contractAddress, metadata_key, metadata_value } = row
      contractAddresses.add(contractAddress)

      if (metadata_key && metadata_value) {
        if (!tokenIds[contractAddress]) {
          tokenIds[contractAddress] = []
        }
        tokenIds[contractAddress].push(metadata_value)
      }
    }

    return {
      contractAddresses: Array.from(contractAddresses),
      tokenIds: Object.keys(tokenIds).length > 0 ? tokenIds : undefined,
    }
  }
}
