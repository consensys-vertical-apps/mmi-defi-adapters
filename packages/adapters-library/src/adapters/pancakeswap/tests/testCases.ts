import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Bsc,
    method: 'positions',

    input: {
      userAddress: '0xE8EEDa4230E37e5a136575151Cedb5f57Fa1cA99',
      filterProtocolTokens: ['0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE'],
    },

    blockNumber: 40899757,
  },
]
