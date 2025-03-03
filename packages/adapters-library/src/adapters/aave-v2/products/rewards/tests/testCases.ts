import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xB82e12d1da436611C5C94d535C3a40F5fB3f35Ab',
      filterProtocolTokens: ['0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5'],
    },

    blockNumber: 21143202,
  },
]
