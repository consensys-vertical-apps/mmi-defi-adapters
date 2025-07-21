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
      userAddress: '0x4DaB76769Baba52643C9648890b801627150E043',
      filterProtocolTokens: ['0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c'],
      openingPositionTxHash:
        '0x47a3136154856fbea1d6e51e0e5da3daf043dd8c2dc90c9ae005056f4060ce22',
    },

    blockNumber: 21105907,
  },
]
