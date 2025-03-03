import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x21C9474156e830C30709e300911dB6Be509559c4',
      filterProtocolTokens: ['0xc3d688B66703497DAA19211EEdff47f25384cdc3'],
    },

    blockNumber: 21189685,
  },
]
