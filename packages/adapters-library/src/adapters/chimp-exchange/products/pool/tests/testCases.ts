import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0xe510668b3f77f4d3be91072fd484f2e6134e65ff',
      filterProtocolTokens: ['0x90D8053f7E29FaAF5189BdcE796a516E29F1F5d3'],
    },
    blockNumber: 1498597,
  },
]
