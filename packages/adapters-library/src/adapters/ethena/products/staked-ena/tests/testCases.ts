import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'sena',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x005fb56fe0401a4017e6f046272da922bbf8df06',
      filterProtocolTokens: ['0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9'],
    },

    blockNumber: 20942611,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: ['0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9'],

    blockNumber: 20942622,
  },
]
