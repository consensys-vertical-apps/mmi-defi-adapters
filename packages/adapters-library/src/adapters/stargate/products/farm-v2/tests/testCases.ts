import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    key: 'farm-v2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x730964F8850708D16f6E455346EB7BC8042c737B',
      filterProtocolTokens: ['0x17BBC9BD51A52aAf4d2CC6652630DaF4fdB358F7'],
    },

    blockNumber: 20641851,
  },
]
