import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',

    input: {
      userAddress: '0x466fE5825B096cEF0f4B3C2E9B4185e042c6E4f0',
      filterProtocolTokens: ['0xAf453A22C59BC4796f78a176fDcc443CFD9Ab3C3'],
    },
    blockNumber: 5184581,
  },
]
