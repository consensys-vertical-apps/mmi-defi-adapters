import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: 'reward',

    input: {
      userAddress: '0x5d14d2fc18f592b0fe5f6ce1ae091380294dcf71',
      filterProtocolTokens: ['0x929EC64c34a17401F460460D4B9390518E5B473e'],
    },

    blockNumber: 264107941,
  },
  {
    key: 'lido-market',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xAa0c3d6fD25Aa2C23AED2659197EF39AeA306172',
      filterProtocolTokens: ['0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb'],
    },

    blockNumber: 22224621,
  },
]
