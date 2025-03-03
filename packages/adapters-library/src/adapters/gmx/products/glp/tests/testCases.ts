import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Avalanche,
    method: 'positions',

    input: {
      userAddress: '0x291f1593C2bA68974bC6E0AE715b52ee313813A6',
      filterProtocolTokens: ['0x01234181085565ed162a948b6a5e88758CD7c7b8'],
    },

    blockNumber: 45143861,
  },

  {
    chainId: Chain.Arbitrum,
    method: 'prices',
    filterProtocolToken: '0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258',
    blockNumber: 201320270,
  },
]
