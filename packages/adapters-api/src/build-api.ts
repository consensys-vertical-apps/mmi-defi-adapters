import { DefiProvider } from '@metamask-institutional/defi-adapters'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ZodError } from 'zod'
import './bigint-json.js'
import type { DbService } from './db-service.js'
import {
  GetPositionsSchema,
  GetSupportSchema,
  IsEthAddress,
} from './schemas.js'

export function buildApi(
  app: Hono,
  defiProvider: DefiProvider,
  dbService: DbService,
) {
  app.use('*', cors())

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

  app.get('/stats/failed-jobs', async (context) => {
    try {
      return context.json({
        data: await dbService.getFailedJobs(),
      })
    } catch (error) {
      return context.json({ error: handleErrorMessage(error) }, 500)
    }
  })
}

function handleErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
