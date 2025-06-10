import { EvmChain } from '@metamask-institutional/defi-adapters'
import { Hono } from 'hono'
import { pinoLogger } from 'hono-pino'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import * as client from 'prom-client'
import { logger } from '../logger.js'

const TEN_MINUTES_IN_MS = 600_000
const INTERNAL_SERVER_ERROR = 500

function addMiddleware(app: Hono) {
  app.use(
    '*',
    pinoLogger({
      pino: logger.child({
        subService: 'api',
      }),
    }),
  )

  app.onError((err, c) => {
    const statusCode =
      'status' in err
        ? (err.status as ContentfulStatusCode)
        : INTERNAL_SERVER_ERROR

    return c.json(
      {
        success: false,
        error: err.message,
      },
      statusCode,
    )
  })
}

export function buildApi(
  workersInfo: Partial<
    Record<
      EvmChain,
      {
        lastProcessedBlockNumber?: number
        latestBlockNumber?: number
        updatedAt: number
      }
    >
  >,
) {
  const app = new Hono()

  addMiddleware(app)

  client.register.clear()
  client.collectDefaultMetrics({})

  app.get('/health', (c) => {
    const chainHealthReport = Object.values(EvmChain)
      .map((chainId) => {
        const chainWorkerInfo = workersInfo[chainId]

        if (!chainWorkerInfo) {
          return undefined
        }

        const blocksLagging =
          chainWorkerInfo.latestBlockNumber &&
          chainWorkerInfo.lastProcessedBlockNumber
            ? chainWorkerInfo.latestBlockNumber -
              chainWorkerInfo.lastProcessedBlockNumber
            : undefined

        return {
          chainId,
          lastProcessedBlockNumber: chainWorkerInfo.lastProcessedBlockNumber,
          latestBlockNumber: chainWorkerInfo.latestBlockNumber,
          updatedAt: chainWorkerInfo.updatedAt,
          blocksLagging,
          healthy: Date.now() - chainWorkerInfo.updatedAt < TEN_MINUTES_IN_MS,
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

    if (chainHealthReport.some((chainHealth) => !chainHealth.healthy)) {
      return c.json(
        {
          message: 'unhealthy',
          chainHealthReport,
        },
        500,
      )
    }

    return c.json({
      message: 'ok',
      chainHealthReport,
    })
  })

  app.get('/metrics', async (context) => {
    context.header('Content-Type', client.register.contentType)
    return context.body(await client.register.metrics())
  })

  return app
}
