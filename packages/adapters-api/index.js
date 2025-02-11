import { DefiProvider } from '@metamask-institutional/defi-adapters'
import express from 'express'

BigInt.prototype.toJSON = function () {
  return this.toString()
}

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

app.post('/positions', async (req, res) => {
  try {
    res.send(await defiProvider.getPositions(req.body))
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.get('/positions/:userAddress', async (req, res) => {
  try {
    res.send(
      await defiProvider.getPositions({
        userAddress: req.params.userAddress,
      }),
    )
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.post('/profits', async (req, res) => {
  try {
    res.send(await defiProvider.getProfits(req.body))
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.get('/support', async (_, res) => {
  try {
    res.send(await defiProvider.getSupport())
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
})

app.listen(port)
