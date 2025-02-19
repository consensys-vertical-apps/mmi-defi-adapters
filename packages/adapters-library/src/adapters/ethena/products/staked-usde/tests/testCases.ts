import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'susde',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x3F843189280A4379EB12B928afD5D96Df8076679',
      filterProtocolTokens: ['0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'],
    },
    blockNumber: 19774108,
  },

  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',

    blockNumber: 19776342,
  },
]
