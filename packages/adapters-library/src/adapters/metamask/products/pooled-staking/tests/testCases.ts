import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x34d3D57df5f06335C4a064f0E26FcDDC78516498',
      filterProtocolTokens: ['0x4FEF9D741011476750A243aC70b9789a63dd47Df'],
    },

    blockNumber: 22127227,
  },
]
