import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0xbD525dfF925DF9c063C77B29d5Eec8f977B79476',

      filterProtocolTokens: ['0x6EA328bf810ef0F0bD1291Eb52f1529aA073cEfa'],
    },

    blockNumber: 221421769,
  },
]
