import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'
import { serve } from '@hono/node-server'
import { DefiProvider, EvmChain } from '@metamask-institutional/defi-adapters'
import { JsonRpcProvider, Network } from 'ethers'
import { buildApi } from './build-api.js'
import { logger } from './logger.js'

const THIRTY_SECONDS_IN_MS = 30_000

const defiProvider = new DefiProvider()

const workersInfo = Object.values(EvmChain).reduce(
  (acc, chainId) => {
    const providerUrl =
      defiProvider.chainProvider.providers[chainId]?._getConnection().url

    if (!providerUrl) {
      return acc
    }

    acc[chainId] = {
      provider: new JsonRpcProvider(providerUrl, chainId, {
        staticNetwork: Network.from(chainId),
        cacheTimeout: THIRTY_SECONDS_IN_MS,
      }),
      updatedAt: Date.now(),
    }
    return acc
  },
  {} as Partial<
    Record<
      EvmChain,
      {
        provider: JsonRpcProvider
        lastProcessedBlockNumber?: number
        updatedAt: number
      }
    >
  >,
)

const app = buildApi(workersInfo)

serve(
  {
    fetch: app.fetch,
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
  },
  (info) => {
    logger.info({ port: info.port }, 'Workers API server is running')
  },
)

startChainProcessingWorker()

function startChainProcessingWorker() {
  const workerPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    'worker-main.js',
  )

  logger.info({ workerPath }, 'Starting chain processing worker')

  const worker = new Worker(workerPath)

  worker.on(
    'message',
    (message: { chainId: EvmChain; blockNumber: number }) => {
      const chainWorkerInfo = workersInfo[message.chainId]

      if (!chainWorkerInfo) {
        logger.warn(
          { chainId: message.chainId },
          'Chain worker not found during update',
        )
        return
      }

      chainWorkerInfo.lastProcessedBlockNumber = message.blockNumber
      chainWorkerInfo.updatedAt = Date.now()
    },
  )
}
