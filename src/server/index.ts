import 'dotenv/config'
import { ApolloServer } from 'apollo-server-express'
import express from 'express'
import { resolvers, typeDefs } from './schema'

const PORT = 4000

const server = new ApolloServer({ typeDefs, resolvers })
const app = express()

server.start().then(() => {
  server.applyMiddleware({
    app,
    cors: true,
  })
})

app.listen(PORT, () => {
  console.log(
    `GraphQL endpoint and playground accessible at http://localhost:${PORT}${server.graphqlPath}`,
  )
})
