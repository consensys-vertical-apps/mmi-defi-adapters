import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xa66d568cd146c01ac44034a01272c69c2d9e4bab',
    },
    blockNumber: 18520799,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xa66d568cd146c01ac44034a01272c69c2d9e4bab',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18520799,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    blockNumber: 18520799,
  },
]
