import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

const User2 = '0xd3363fA4E7EDdA471527d960D65EFBc6351cC094' // Has weETHk

export const testCases: TestCase[] = [
  {
    key: 'user2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: User2,

      filterProtocolTokens: ['0x7223442cad8e9cA474fC40109ab981608F8c4273'],
    },

    blockNumber: 20751518,
  },
]
