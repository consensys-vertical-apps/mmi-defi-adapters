import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    key: 'supply',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xe141062f056c612a3f013d354ab89edadaf38ffd',

      filterProtocolTokens: [
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
        '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
      ],
    },

    blockNumber: 19383091,
  },
]
