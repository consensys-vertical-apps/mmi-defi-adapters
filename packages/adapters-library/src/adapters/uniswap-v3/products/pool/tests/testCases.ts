import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',

      filterProtocolTokens: [
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      ],

      filterTokenIds: ['567587', '573046'],
    },
    blockNumber: 18326120,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '2',
    input: {
      userAddress: '0x69D727a5F4731271C36DC600AE9fa3E6F3Ae29B6',

      filterProtocolTokens: [
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      ],

      filterTokenIds: ['587543', '587789'],
    },
    blockNumber: 18412988,
  },
]
