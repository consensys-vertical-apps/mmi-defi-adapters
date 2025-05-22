import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: ['0x4D75a9342113c106F48117d81e2952A5828d1B5F'],
    },

    blockNumber: 21342510,
  },
  {
    chainId: Chain.Linea,
    method: 'positions',

    input: {
      userAddress: '0x3130d2b8cbf0798bb1cbf2a4f527dbae953ff27f',

      filterProtocolTokens: [
        '0x3289Cc896E661e3a252609efA4380875F0ce66Ec',
        '0x3d80b49fc4DC9E450efAc1BD34cdEB2F303c2E81',
      ],
    },

    blockNumber: 12929711,
  },
]
