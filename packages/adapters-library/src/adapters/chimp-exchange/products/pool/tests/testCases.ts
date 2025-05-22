import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',

    input: {
      userAddress: '0xAaCa2395971909e2CE417a342f283AcF08C1dcaF',
      filterProtocolTokens: ['0x90D8053f7E29FaAF5189BdcE796a516E29F1F5d3'],
    },

    blockNumber: 19250226,
  },
]
