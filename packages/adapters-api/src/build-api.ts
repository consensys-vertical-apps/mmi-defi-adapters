import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { DefiProvider } from '@metamask-institutional/defi-adapters'
import { type PinoLogger, pinoLogger } from 'hono-pino'
import { cors } from 'hono/cors'
import './bigint-json.js'
import { type RequestIdVariables, requestId } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { DbService } from './db-service.js'
import { logger } from './logger.js'
import {
  GetPositionsParamsSchema,
  GetPositionsQuerySchema,
  GetSupportParamsSchema,
  IsEthAddress,
} from './schemas.js'
import {
  UNPROCESSABLE_ENTITY,
  INTERNAL_SERVER_ERROR,
  OK,
} from './http-status-codes.js'

function createApp() {
  return new OpenAPIHono<{
    Variables: RequestIdVariables & {
      logger: PinoLogger
    }
  }>({
    strict: false,
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: result.success,
            error: result.error.flatten(),
          },
          UNPROCESSABLE_ENTITY,
        )
      }
    },
  })
}

function addMiddleware(app: ReturnType<typeof createApp>) {
  app.use('*', cors())
  app.use('*', requestId())
  app.use(
    '*',
    pinoLogger({
      pino: logger,
    }),
  )

  app.onError((err, c) => {
    const statusCode =
      'status' in err
        ? (err.status as ContentfulStatusCode)
        : INTERNAL_SERVER_ERROR

    return c.json(
      {
        message: err.message,
      },
      statusCode,
    )
  })
}

export function buildApi(defiProvider: DefiProvider, dbService: DbService) {
  const app = createApp()

  addMiddleware(app)

  app.openapi(
    createRoute({
      path: '/health',
      method: 'get',
      tags: ['health'],
      responses: {
        [OK]: {
          content: {
            'application/json': {
              schema: z.object({ message: z.literal('ok') }),
            },
          },
          description: 'Returns an OK status if the API is healthy',
        },
      },
    }),
    (context) => context.json({ message: 'ok' as const }),
  )

  app.openapi(
    createRoute({
      path: '/positions/{userAddress}',
      method: 'get',
      tags: ['defi'],
      request: {
        params: GetPositionsParamsSchema,
        query: GetPositionsQuerySchema,
      },
      responses: {
        [OK]: {
          content: {
            'application/json': {
              schema: z.object({
                data: z.array(z.any()), // TODO
              }),
            },
          },
          description: 'Returns positions for the given address',
        },
        [UNPROCESSABLE_ENTITY]: {
          content: {
            'application/json': {
              schema: z.any(), // TODO
            },
          },
          description: 'Invalid input',
        },
      },
    }),
    async (context) => {
      const { userAddress } = context.req.valid('param')
      const getPositionsInput = context.req.valid('query')

      return context.json({
        data: await defiProvider.getPositions({
          userAddress,
          ...getPositionsInput,
        }),
      })
    },
  )

  app.openapi(
    createRoute({
      path: '/support',
      method: 'get',
      tags: ['defi'],
      request: {
        query: GetSupportParamsSchema,
      },
      responses: {
        [OK]: {
          content: {
            'application/json': {
              schema: z.object({
                data: z.object({}), // TODO
              }),
            },
          },
          description: 'Returns positions for the given address',
        },
        [UNPROCESSABLE_ENTITY]: {
          content: {
            'application/json': {
              schema: z.any(), // TODO
            },
          },
          description: 'Invalid input',
        },
      },
    }),
    async (context) => {
      const getSupportInput = context.req.valid('query')

      return context.json({
        data: await defiProvider.getSupport(getSupportInput),
      })
    },
  )

  app.get('/user-pools/:userAddress', async (context) => {
    const userAddress = IsEthAddress.parse(context.req.param('userAddress'))
    return context.json({
      data: await dbService.getAddressPools(userAddress),
    })
  })

  app.get('/stats/blocks', async (context) => {
    return context.json({
      data: await dbService.getBlocksStats(
        async (chainId) =>
          await defiProvider.chainProvider.providers[chainId]?.getBlockNumber(),
      ),
    })
  })

  app.get('/stats/jobs', async (context) => {
    return context.json({
      data: await dbService.getJobsStats(),
    })
  })

  app.get('/stats/logs', async (context) => {
    return context.json({
      data: await dbService.getLogsStats(),
    })
  })

  app.get('/stats/table-sizes', async (context) => {
    return context.json({
      data: await dbService.getTableSizesStats(),
    })
  })

  app.get('/stats/failed-jobs', async (context) => {
    return context.json({
      data: await dbService.getFailedJobs(),
    })
  })

  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'DeFi Adapters API',
    },
  })

  return app
}
