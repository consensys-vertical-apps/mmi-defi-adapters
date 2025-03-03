import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',

      filterProtocolTokens: ['0x59cD1C87501baa753d0B5B5Ab5D8416A45cD71DB'],
    },

    blockNumber: 20112246,
  },
]
