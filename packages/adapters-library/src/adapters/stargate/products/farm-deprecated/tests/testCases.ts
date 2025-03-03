import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: '1',
    input: {
      userAddress: '0x6372baD16935878713e5e1DD92EC3f7A3C48107E',
      filterProtocolTokens: ['0x892785f33CdeE22A30AEF750F285E18c18040c3e'],
    },

    blockNumber: 268835087,
  },
]
