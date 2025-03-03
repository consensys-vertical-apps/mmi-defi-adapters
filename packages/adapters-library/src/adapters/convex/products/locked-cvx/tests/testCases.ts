import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x4d9ad4C310856A582b294726a4fa7a97b2169dC7',
      filterProtocolTokens: ['0x72a19342e8F1838460eBFCCEf09F6585e32db86E'],
    },

    blockNumber: 21273095,
  },
]
