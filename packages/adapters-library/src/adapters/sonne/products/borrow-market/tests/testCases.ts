import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Optimism,
    method: 'positions',

    input: {
      userAddress: '0xaA62CF7caaf0c7E50Deaa9d5D0b907472F00B258',

      filterProtocolTokens: ['0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F'],
    },

    blockNumber: 119518821,
  },
  {
    chainId: Chain.Optimism,
    method: 'profits',

    input: {
      userAddress: '0xaA62CF7caaf0c7E50Deaa9d5D0b907472F00B258',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: ['0xEC8FEa79026FfEd168cCf5C627c7f486D77b765F'],
    },

    blockNumber: 119518821,
  },
]
