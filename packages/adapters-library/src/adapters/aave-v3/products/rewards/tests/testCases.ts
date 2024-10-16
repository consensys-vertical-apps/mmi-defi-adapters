import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'
import { WriteActions } from '../../../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: 'reward',

    input: {
      userAddress: '0x5d14d2fc18f592b0fe5f6ce1ae091380294dcf71',
      filterProtocolTokens: ['0x929EC64c34a17401F460460D4B9390518E5B473e'],
    },

    blockNumber: 264107941,
  },
]
