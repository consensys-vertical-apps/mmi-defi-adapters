import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
      filterProtocolTokens: ['0x465a5a630482f3abD6d3b84B39B29b07214d19e5'],
    },
    blockNumber: 19321516,
  },
]
