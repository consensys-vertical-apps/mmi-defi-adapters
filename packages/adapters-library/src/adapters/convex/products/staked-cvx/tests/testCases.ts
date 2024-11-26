import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x270035C9073c52eE3509Ae8B9821653488F92B39',
      filterProtocolTokens: ['0xCF50b810E57Ac33B91dCF525C6ddd9881B139332'],
    },

    blockNumber: 21272742,
  },
]
