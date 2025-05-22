import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',

    input: {
      userAddress: '0x4159f5DF51faB9b89335990FFFaf1Eb66008A4b1',
      filterProtocolTokens: ['0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c'],
    },

    blockNumber: 19250308,
  },
]
