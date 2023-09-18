import { gql } from 'apollo-server-express'
import { getPositions } from '../../lib/main'

export const typeDefs = gql`
  type Position {
    chainId: Int
    name: String
    description: String
    iconUrl: String
    siteUrl: String
  }

  type Query {
    positions(userAddress: String!, chainId: [Int]): [Position]
  }

  schema {
    query: Query
  }
`
export const resolvers = {
  Query: {
    positions: (userAddress: string) => getPositions({ userAddress }),
  },
}
