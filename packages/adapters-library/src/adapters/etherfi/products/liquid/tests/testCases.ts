import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

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
  {
    key: 'user2',
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: User2,
      timePeriod: TimePeriod.thirtyDays,

      filterProtocolTokens: ['0x7223442cad8e9cA474fC40109ab981608F8c4273'],
    },

    blockNumber: 20751570,
  },
]
