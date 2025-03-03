import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Polygon,
    method: 'positions',

    input: {
      userAddress: '0x51b93f0ca523faf0afE6F7049Cfd4aFdc513BcE5',
      filterProtocolTokens: ['0xdC9232E2Df177d7a12FdFf6EcBAb114E2231198D'],
    },

    blockNumber: 54212235,
  },
]
