import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

const User3 = '0x566d2176Ecb1d8eA07D182b47B5aC57511337E00' // Has weETH on Base
const User4 = '0x51525Be6985e1B1c46f746a231B1d186B52860DC' // Has weETH on Linea

export const testCases: TestCase[] = [
  {
    key: 'user3',
    chainId: Chain.Base,
    method: 'positions',

    input: {
      userAddress: User3,
      filterProtocolTokens: ['0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A'],
    },

    blockNumber: 19840743,
  },

  {
    key: 'user4',
    chainId: Chain.Linea,
    method: 'positions',

    input: {
      userAddress: User4,
      filterProtocolTokens: ['0x1Bf74C010E6320bab11e2e5A532b5AC15e0b8aA6'],
    },

    blockNumber: 9527882,
  },
]
