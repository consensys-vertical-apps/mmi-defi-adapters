import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50',
    },
    blockNumber: 150947313,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'prices',
    blockNumber: 150947313,
  },
]
