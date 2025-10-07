// Import necessary modules for blockchain processing, database operations, and logging
import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, Network } from 'ethers'
import type { Logger } from 'pino'
import {
  type CacheClient,
  createPostgresCacheClient,
} from './database/postgres-cache-client.js'
import { logger } from './logger.js'
import { runnerLoop } from './runner-loop.js'
import { updateNewJobs } from './update-new-jobs.js'
import { extractErrorMessage } from './utils/extractErrorMessage.js'

// Validate that the database connection URL is provided via environment variable
// This is required for storing and retrieving blockchain processing state
if (!process.env.CACHE_DATABASE_URL) {
  logger.error('CACHE_DATABASE_URL is required')
  process.exit(1)
}

logger.info('Worker started: Processing EVM chains')
// Create a DeFi provider instance that contains configuration for all supported blockchain networks
const defiProvider = new DefiProvider()

// Process all supported EVM chains in parallel
// Each chain gets its own processing pipeline to maximize efficiency
await Promise.all(
  Object.values(EvmChain).map(async (chainId) => {
    // Create a child logger with chain-specific context for better log organization
    const childLogger = logger.child({ chainId })
    try {
      childLogger.info('Starting worker')

      // Create a database connection client for this specific chain
      // This allows us to store and retrieve processing state per chain
      const cacheClient = await createPostgresCacheClient({
        dbUrl: process.env.CACHE_DATABASE_URL!,
        chainId,
        partialPoolConfig: {
          max: 10, // Maximum 10 concurrent database connections
          idleTimeoutMillis: 0, // Keep connections alive indefinitely
        },
        logger: childLogger,
      })

      // Get the RPC endpoint URL for this blockchain network
      // This is where we'll connect to fetch blockchain data
      const providerUrl =
        defiProvider.chainProvider.providers[chainId]?._getConnection().url

      // Skip processing if no RPC provider is configured for this chain
      if (!providerUrl) {
        childLogger.error('Provider missing for this chain')
        return
      }

      // Create an ethers.js provider to interact with the blockchain
      // This handles JSON-RPC communication with the blockchain node
      const provider = new JsonRpcProvider(providerUrl, chainId, {
        staticNetwork: Network.from(chainId),
      })

      // Determine which block number to start processing from
      // This could be the last processed block from DB or current block from chain
      const blockNumber = await getBlockToProcess(
        cacheClient,
        provider,
        childLogger,
      )

      // Update the job queue with new processing tasks for this chain
      // This identifies what DeFi protocols and positions need to be processed
      await updateNewJobs({
        chainId,
        blockNumber,
        defiProvider,
        cacheClient,
        logger: childLogger,
      })

      // Start the main processing loop for this chain
      // This continuously processes blocks and updates positions
      await runnerLoop({
        blockNumber,
        provider,
        chainId,
        cacheClient,
        logger: childLogger,
      })
    } catch (error) {
      // If any chain fails, log the error and exit the entire worker process
      // This ensures we don't continue with corrupted state
      childLogger.error(
        { chainId, error: extractErrorMessage(error) },
        'Runner execution failed',
      )

      process.exit(1)
    }
  }),
)

/**
 * Determines which block number to start processing from
 * Priority: 1) Last processed block from database, 2) Current block from blockchain
 */
async function getBlockToProcess(
  cacheClient: CacheClient,
  provider: JsonRpcProvider,
  logger: Logger,
) {
  // Try to get the last processed block number from the database
  // This allows us to resume processing from where we left off
  const dbBlockNumber = await cacheClient.getLatestBlockProcessed()

  if (dbBlockNumber) {
    logger.info({ dbBlockNumber }, 'Last block processed fetched from DB')
    return dbBlockNumber
  }

  // If no previous processing state exists, start from the current blockchain block
  try {
    const blockNumber = await provider.getBlockNumber()
    logger.info({ blockNumber }, 'Block number fetched from provider')
    return blockNumber
  } catch (error) {
    // If we can't connect to the blockchain, log the error and exit
    logger.error(
      { error, providerUrl: provider._getConnection().url },
      'Error fetching block number',
    )
    process.exit(1)
  }
}
