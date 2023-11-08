import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x7fe4b2632f5ae6d930677d662af26bc0a06672b3',
    },
    blockNumber: 18527822,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x7fe4b2632f5ae6d930677d662af26bc0a06672b3',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18527822,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    blockNumber: 18527822,
  },
]
