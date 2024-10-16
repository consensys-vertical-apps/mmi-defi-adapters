import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

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

    filterProtocolTokens: [
      '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      '0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9',
      '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
      '0x57e114B691Db790C35207b2e685D4A43181e6061',
    ],

    blockNumber: 20942622,
  },
]
