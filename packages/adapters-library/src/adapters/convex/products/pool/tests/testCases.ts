import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    blockNumber: 18634843, // 14447312 + 1, // next block after deposit transaction
    input: {
      userAddress: '0xdf286De6d3de10A6aD6452d0BA94Af7AD7B68F9B',

      filterProtocolTokens: [
        '0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C',
        '0x689440f2Ff927E1f24c72F1087E1FAF471eCe1c8',
      ],
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xdf286De6d3de10A6aD6452d0BA94Af7AD7B68F9B',
      fromBlock: 14443070 - 1,
      toBlock: 14443070 + 1,
      protocolTokenAddress: '0x30d9410ed1d5da1f6c8391af5338c93ab8d4035c',
    },
  },
]
