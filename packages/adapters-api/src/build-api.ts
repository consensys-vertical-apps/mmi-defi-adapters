import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { DefiProvider } from '@metamask-institutional/defi-adapters'
import { type PinoLogger, pinoLogger } from 'hono-pino'
import { cors } from 'hono/cors'
import './bigint-json.js'
import { type RequestIdVariables, requestId } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import * as client from 'prom-client'
import type { DbService } from './db-service.js'
import {
  INTERNAL_SERVER_ERROR,
  OK,
  UNPROCESSABLE_ENTITY,
} from './http-status-codes.js'
import { logger } from './logger.js'
import {
  GetPositionsParamsSchema,
  GetPositionsQuerySchema,
  GetSupportQuerySchema,
  IsEthAddress,
} from './schemas-request.js'
import {
  GetPositionsResponseSchema,
  GetSupportResponseSchema,
  ValidationErrorSchema,
} from './schemas-response.js'

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
            error: result.error,
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
        success: false,
        error: err.message,
      },
      statusCode,
    )
  })
}

export function buildApi(defiProvider: DefiProvider, dbService: DbService) {
  const app = createApp()

  addMiddleware(app)

  client.register.clear()
  client.collectDefaultMetrics({})

  app.get('/health', async (context) => {
    return context.json({ message: 'ok' })
  })

  app.get('/metrics', async (context) => {
    context.header('Content-Type', client.register.contentType)
    return context.body(await client.register.metrics())
  })

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
                data: GetPositionsResponseSchema,
              }),
            },
          },
          description: 'Returns positions for the given address',
        },
        [UNPROCESSABLE_ENTITY]: {
          content: {
            'application/json': {
              schema: ValidationErrorSchema,
            },
          },
          description: 'Invalid input',
        },
      },
    }),
    async (context) => {
      const { userAddress } = context.req.valid('param')
      const getPositionsInput = context.req.valid('query')

      const data = (await defiProvider.getPositions({
        userAddress,
        ...getPositionsInput,
      })) as GetPositionsResponseSchema

      return context.json(
        {
          data,
        },
        200,
      )
    },
  )

  app.openapi(
    createRoute({
      path: '/support',
      method: 'get',
      tags: ['defi'],
      request: {
        query: GetSupportQuerySchema,
      },
      responses: {
        [OK]: {
          content: {
            'application/json': {
              schema: z.object({
                data: GetSupportResponseSchema,
              }),
            },
          },
          description: 'Returns support for the given address',
        },
        [UNPROCESSABLE_ENTITY]: {
          content: {
            'application/json': {
              schema: ValidationErrorSchema,
            },
          },
          description: 'Invalid input',
        },
      },
    }),
    async (context) => {
      const getSupportInput = context.req.valid('query')

      const data = (await defiProvider.getSupport(
        getSupportInput,
      )) as GetSupportResponseSchema

      return context.json(
        {
          data,
        },
        200,
      )
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

  app.doc31('/openapi', {
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'DeFi Adapters API',
    },
  })

  return app
}
