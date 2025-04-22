import { OpenAPIHono } from '@hono/zod-openapi'
import { DefiProvider } from '@metamask-institutional/defi-adapters'
import { type PinoLogger, pinoLogger } from 'hono-pino'
import { cors } from 'hono/cors'
import { ZodError } from 'zod'
import './bigint-json.js'
import { type RequestIdVariables, requestId } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { DbService } from './db-service.js'
import {
  INTERNAL_SERVER_ERROR,
  OK,
  UNPROCESSABLE_ENTITY,
} from './http-codes.js'
import { logger } from './logger.js'
import {
  GetPositionsSchema,
  GetSupportSchema,
  IsEthAddress,
} from './schemas.js'

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
        message: err.message,
      },
      statusCode,
    )
  })
}

export function buildApi(defiProvider: DefiProvider, dbService: DbService) {
  const app = createApp()

  addMiddleware(app)

  app.get('/health', (context) => context.json({ message: 'ok' }))

  app.get('/positions/:userAddress', async (context) => {
    try {
      const input = {
        userAddress: context.req.param('userAddress'),
        ...context.req.query(),
      }
      const parsedInput = GetPositionsSchema.parse(input)

      return context.json({
        data: await defiProvider.getPositions(parsedInput),
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return context.json({ error: error.message }, 400)
      }

      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  app.get('/support', async (context) => {
    try {
      const input = context.req.query()
      const parsedInput = GetSupportSchema.parse(input)

      return context.json({
        data: await defiProvider.getSupport(parsedInput),
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return context.json({ error: error.message }, 400)
      }

      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  app.get('/user-pools/:userAddress', async (context) => {
    try {
      const userAddress = IsEthAddress.parse(context.req.param('userAddress'))
      return context.json({
        data: await dbService.getAddressPools(userAddress),
      })
    } catch (error) {
      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  app.get('/stats/blocks', async (context) => {
    try {
      return context.json({
        data: await dbService.getBlocksStats(
          async (chainId) =>
            await defiProvider.chainProvider.providers[
              chainId
            ]?.getBlockNumber(),
        ),
      })
    } catch (error) {
      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  app.get('/stats/jobs', async (context) => {
    try {
      return context.json({
        data: await dbService.getJobsStats(),
      })
    } catch (error) {
      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  app.get('/stats/logs', async (context) => {
    try {
      return context.json({
        data: await dbService.getLogsStats(),
      })
    } catch (error) {
      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  app.get('/stats/table-sizes', async (context) => {
    try {
      return context.json({
        data: await dbService.getTableSizesStats(),
      })
    } catch (error) {
      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  app.get('/stats/failed-jobs', async (context) => {
    try {
      return context.json({
        data: await dbService.getFailedJobs(),
      })
    } catch (error) {
      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })

  return app
}

function handleErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
