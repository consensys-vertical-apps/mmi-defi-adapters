import {
  ChainName,
  type DefiPositionDetection,
  EvmChain,
} from '@codefi/defi-adapters'
import pg from 'pg'
import type { Logger } from 'pino'
import { createDbPool } from './postgres-utils.js'

/**
 *
 * Keeping it here for now but i believe we can reuse the postgres client code, since this is only used by CLI commands - will keep as it for now
 *
 * Builds a PostgreSQL-based DeFi position detection function
 *
 * This function creates a DefiPositionDetection function that queries the PostgreSQL
 * database to find user positions and associated metadata. It's used by the workers
 * to detect positions when processing events and building the cache.
 *
 * @param dbUrl - PostgreSQL connection URL
 * @param logger - Optional logger for database operations
 * @returns DefiPositionDetection function that queries PostgreSQL
 */
export function buildPostgresDefiPositionsDetectionQuery({
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
    // Query the logs table for all positions and metadata for this user on this chain
    const res = await dbPools[chainId].query(
      `SELECT contract_address as "contractAddress", metadata_key, metadata_value
         FROM logs
         WHERE address = $1`,
      [userAddress],
    )

    const contractAddresses = new Set<string>()
    const positionMetadataByContractAddress: Record<string, string[]> = {}

    // Process each row to build the response
    for (const row of res.rows) {
      const { contractAddress, metadata_key, metadata_value } = row

      // Add contract address to the set (automatically handles duplicates)
      contractAddresses.add(contractAddress)

      // If this row has metadata, add it to the contract's metadata array
      if (metadata_key && metadata_value) {
        if (!positionMetadataByContractAddress[contractAddress]) {
          positionMetadataByContractAddress[contractAddress] = []
        }
        positionMetadataByContractAddress[contractAddress].push(metadata_value)
      }
    }

    return {
      contractAddresses: Array.from(contractAddresses),
      // Only include metadata if there are any metadata entries
      positionMetadataByContractAddress:
        Object.keys(positionMetadataByContractAddress).length > 0
          ? positionMetadataByContractAddress
          : undefined,
    }
  }
}
