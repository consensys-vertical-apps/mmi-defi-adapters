import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'lp-staking',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x577c6a57c435b53c7d5c6878c7736b9781c778a3',

      filterProtocolTokens: [
        '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
        '0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9',
      ],
    },

    blockNumber: 20942612,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: ['0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9'],

    blockNumber: 20942622,
  },
]
