import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Optimism,
    method: 'positions',

    input: {
      userAddress: '0xaA62CF7caaf0c7E50Deaa9d5D0b907472F00B258',

      filterProtocolTokens: ['0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F'],
    },

    blockNumber: 119518821,
  },
]
