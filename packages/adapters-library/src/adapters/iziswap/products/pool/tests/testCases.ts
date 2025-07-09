import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

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
  {
    chainId: Chain.Linea,
    method: 'positions',
    key: '2',

    input: {
      userAddress: '0xDa4eCF93f4FF9aa1F868a39C5520d29e1A9F07De',
      filterProtocolTokens: ['0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c'],
      openingPositionTxHash:
        '0x8ff686dae6f77175e7f55f47806181e70d69758495df43db6a566cf29b9f76ab',
    },

    blockNumber: 20715268,
  },
]
