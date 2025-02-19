import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'single-position',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xd02495dcd1f82b1706c6b5e19d5dd01cfa49177b',
      filterProtocolTokens: ['0x06da0fd433C1A5d7a4faa01111c044910A184553'],
    },

    blockNumber: 19326319,
  },
  {
    key: 'multiple-positions',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x1F14bE60172b40dAc0aD9cD72F6f0f2C245992e8',

      filterProtocolTokens: [
        '0x397FF1542f962076d0BFE58eA045FfA2d347ACa0',
        '0x795065dCc9f64b5614C407a6EFDC400DA6221FB0',
        '0x06da0fd433C1A5d7a4faa01111c044910A184553',
      ],
    },

    blockNumber: 19326319,
  },
]
