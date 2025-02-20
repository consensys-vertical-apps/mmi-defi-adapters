import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x9CBF099ff424979439dFBa03F00B5961784c06ce',

      filterProtocolTokens: [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      ],

      filterTokenIds: [
        '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41',
        '0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc',
        '0xa921ef34e2fc7a27ccc50ae7e4b154e16c9799d3387076c421423ef52ac4df99',
        '0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49',
        '0x49bb2d114be9041a787432952927f6f144f05ad3e83196a7d062f374ee11d0ee',
      ],
    },
    key: '2',
    blockNumber: 19425631,
  },
]
