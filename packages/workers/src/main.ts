// Import necessary modules for file system operations, worker threads, and web server
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
import { serve } from '@hono/node-server'
import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { buildApi } from './api/build-api.js'
import { logger } from './logger.js'

// Create a DeFi provider instance that will be used to check which blockchain networks are supported
const defiProvider = new DefiProvider()

// Initialize tracking object for all supported blockchain networks
// This object will store metadata about each chain's processing status
const workersInfo = Object.values(EvmChain).reduce(
  (acc, chainId) => {
    // Only include chains that are actually supported by the DeFi provider
    // Skip chains that don't have a provider configured
    if (!defiProvider.chainProvider.providers[chainId]) {
      return acc
    }

    // Add this chain to our tracking object with initial metadata
    acc[chainId] = {
      updatedAt: Date.now(), // Track when this chain info was last updated
    }
    return acc
  },
  {} as Partial<
    Record<
      EvmChain,
      {
        lastProcessedBlockNumber?: number // The last block number that was processed for this chain
        latestBlockNumber?: number // The current latest block number on this chain
        updatedAt: number // Timestamp of when this info was last updated
      }
    >
  >,
)

// Build the API routes and handlers using the workers info
// This creates the HTTP endpoints that external services can call to get chain status
const app = buildApi(workersInfo)

// Start the HTTP server that will serve the API endpoints
serve(
  {
    fetch: app.fetch, // Use the built API's fetch handler
    port: process.env.PORT ? Number(process.env.PORT) : 4000, // Use PORT env var or default to 4000
  },
  (info) => {
    logger.info({ port: info.port }, 'Workers API server is running')
  },
)

// Start the background worker that will process blockchain data
startChainProcessingWorker()

/**
 * Creates and manages a worker thread that processes blockchain data
 * This worker runs in a separate thread to avoid blocking the main API server
 */
function startChainProcessingWorker() {
  // Resolve the path to the worker script file
  // This gets the directory of the current file and appends 'main-worker.js'
  const workerPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'main-worker.js',
  )

  logger.info({ workerPath }, 'Starting chain processing worker')

  // Create a new worker thread that will run the main-worker.js script
  const worker = new Worker(workerPath)

  // Listen for messages from the worker thread
  // The worker will send updates about blockchain processing progress
  worker.on(
    'message',
    ({
      chainId,
      lastProcessedBlockNumber,
      latestBlockNumber,
    }: {
      chainId: EvmChain
      lastProcessedBlockNumber: number
      latestBlockNumber: number
    }) => {
      // Find the chain info in our tracking object
      const chainWorkerInfo = workersInfo[chainId]

      // If we don't have info for this chain, log a warning and skip
      if (!chainWorkerInfo) {
        logger.warn({ chainId }, 'Chain worker not found during update')
        return
      }

      // Update the chain's processing status with the latest data from the worker
      chainWorkerInfo.lastProcessedBlockNumber = lastProcessedBlockNumber
      chainWorkerInfo.latestBlockNumber = latestBlockNumber
      chainWorkerInfo.updatedAt = Date.now()
    },
  )
}
