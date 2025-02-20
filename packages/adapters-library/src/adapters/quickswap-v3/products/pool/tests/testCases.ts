import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Polygon,
    method: 'positions',
    key: '1',
    input: {
      userAddress: '0xB1C95aC3fcFB2A21A79BA5f95Cce0Ff2237f1692',
      filterProtocolTokens: ['0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6'],
      filterTokenIds: ['144215'],
    },

    blockNumber: 65031322,
  },
  {
    chainId: Chain.Polygon,
    method: 'positions',
    key: '2',
    input: {
      userAddress: '0x36384b230F079Ef0813B68e3938E1A135d6e7A26',

      filterProtocolTokens: [
        '0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6',
        '0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6',
      ],

      filterTokenIds: ['143872', '144209'],
    },

    blockNumber: 65031322,
  },
]
