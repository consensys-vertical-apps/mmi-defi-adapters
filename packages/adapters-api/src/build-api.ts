import { DefiProvider } from '@metamask-institutional/defi-adapters'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ZodError } from 'zod'
import './bigint-json.js'
import { GetPositionsSchema, GetSupportSchema } from './schemas.js'

export function buildApi(app: Hono, defiProvider: DefiProvider) {
  app.use('*', cors())

  app.get('/', (context) => context.text('Ok'))

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
}

function handleErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
