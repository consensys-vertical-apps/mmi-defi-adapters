import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'positions',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',

      filterProtocolTokens: [
        '0x004626A008B1aCdC4c74ab51644093b155e59A23',
        '0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776',
      ],
    },
    blockNumber: 19410813,
  },
  {
    key: 'positions-filter',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      filterProtocolTokens: ['0x004626A008B1aCdC4c74ab51644093b155e59A23'],
    },
    blockNumber: 19410813,
  },

  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x004626A008B1aCdC4c74ab51644093b155e59A23',
    blockNumber: 19544644,
  },
]
