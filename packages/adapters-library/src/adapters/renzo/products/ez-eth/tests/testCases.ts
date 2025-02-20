import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x46896eB79d926712E1134fad5ACBaAF53c1cbE74',
      filterProtocolTokens: ['0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'],
    },

    blockNumber: 20111277,
  },

  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110',
    blockNumber: 20118664,
  },
]
