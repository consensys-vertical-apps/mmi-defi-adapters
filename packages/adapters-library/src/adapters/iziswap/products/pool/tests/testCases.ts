import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x9bb2fac54f168bce6986c3856fcb42d5c365b689',
      filterProtocolTokens: ['0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c'],
    },
    blockNumber: 1119633,
  },
]
