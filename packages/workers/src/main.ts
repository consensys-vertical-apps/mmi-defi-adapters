import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
import { serve } from '@hono/node-server'
import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { buildApi } from './api/build-api.js'
import { logger } from './logger.js'

const defiProvider = new DefiProvider()

const workersInfo = Object.values(EvmChain).reduce(
  (acc, chainId) => {
    // Do not add an entry for chains that are not supported
    if (!defiProvider.chainProvider.providers[chainId]) {
      return acc
    }

    acc[chainId] = {
      updatedAt: Date.now(),
    }
    return acc
  },
  {} as Partial<
    Record<
      EvmChain,
      {
        lastProcessedBlockNumber?: number
        latestBlockNumber?: number
        updatedAt: number
      }
    >
  >,
)

const app = buildApi(workersInfo)

serve(
  {
    fetch: app.fetch,
    port: process.env.PORT ? Number(process.env.PORT) : 4000,
  },
  (info) => {
    logger.info({ port: info.port }, 'Workers API server is running')
  },
)

startChainProcessingWorker()

function startChainProcessingWorker() {
  const workerPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'main-worker.js',
  )

  logger.info({ workerPath }, 'Starting chain processing worker')

  const worker = new Worker(workerPath)

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
      const chainWorkerInfo = workersInfo[chainId]

      if (!chainWorkerInfo) {
        logger.warn({ chainId }, 'Chain worker not found during update')
        return
      }

      chainWorkerInfo.lastProcessedBlockNumber = lastProcessedBlockNumber
      chainWorkerInfo.latestBlockNumber = latestBlockNumber
      chainWorkerInfo.updatedAt = Date.now()
    },
  )
}
