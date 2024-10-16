import { DefiProvider } from '@metamask-institutional/defi-adapters'
import express from 'express'

const defiProvider = new DefiProvider({
  enableFailover: false,
})

const app = express()
const port = 3000

app.get('/', (_, res) => {
  res.send('Ok')
})

app.post('/positions', async (req, res) => {
  const positions = await defiProvider.getPositions(req.body)
  res.send(positions)
})

app.post('/profits', async (req, res) => {
  const positions = await defiProvider.getProfits(req.body)
  res.send(positions)
})

app.get('/support', async (_, res) => {
  const support = await defiProvider.getSupport()
  res.send(support)
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
