import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0x5ae3E5Cda4aaa9204dB5be726b30804483580a95',
      filterProtocolTokens: ['0xd2D8BEB901f90163bE4667A85cDDEbB7177eb3E3'],
    },

    blockNumber: 269553632,
  },
]
