import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x394F94ca8Dec8D0bD48c738AB28dCe146a67Bbd9',
      filterProtocolTokens: ['0xFb932A75c5F69d03B0F6e59573FDe6976aF0D88C'],
    },

    blockNumber: 20862963,
  },
]
