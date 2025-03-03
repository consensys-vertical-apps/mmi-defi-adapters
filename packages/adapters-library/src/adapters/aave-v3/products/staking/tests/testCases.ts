import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    key: 'stkGHO',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x10fd41ec6FDFE7f9C7Cc7c12DC4f0B4e77659BfA',
      filterProtocolTokens: ['0x1a88Df1cFe15Af22B3c4c783D4e6F7F9e0C1885d'],
    },

    blockNumber: 21136131,
  },
  {
    key: 'balancer',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x9EDCE78578a8128287e65e6e293f1DaedD57451D',
      filterProtocolTokens: ['0x9eDA81C21C273a82BE9Bbc19B6A6182212068101'],
    },

    blockNumber: 21242553,
  },
]
