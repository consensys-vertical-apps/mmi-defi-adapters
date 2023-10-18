import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: ' 0x9fcc67d7db763787bb1c7f3bc7f34d3c548c19fe',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
  },
]
