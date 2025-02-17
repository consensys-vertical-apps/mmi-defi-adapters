import { DefiProvider } from '@metamask-institutional/defi-adapters'
import express from 'express'
import { ZodError } from 'zod'
import './bigint-json.js'
import { GetPositionsSchema, GetSupportSchema } from './schemas.js'

const defiProvider = new DefiProvider({
  enableFailover: false,
})

const app = express()
const port = 3000

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  )
  next()
})

app.use(express.json())

app.get('/', (_, res) => {
  res.send('Ok')
})

app.get('/positions/:userAddress', async (req, res) => {
  try {
    const parsedInput = GetPositionsSchema.parse(req)
    res.send(await defiProvider.getPositions(parsedInput))
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).send({ error: error.message })
      return
    }

    res.status(500).send({ error: handleErrorMessage(error) })
  }
})

app.get('/support', async (req, res) => {
  try {
    const parsedInput = GetSupportSchema.parse(req)
    res.send(await defiProvider.getSupport(parsedInput))
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).send({ error: error.message })
      return
    }

    res.status(500).send({ error: handleErrorMessage(error) })
  }
})

app.listen(port)

function handleErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
