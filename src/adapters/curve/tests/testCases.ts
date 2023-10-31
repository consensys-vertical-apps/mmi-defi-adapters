import { Chain, TimePeriod } from '../../../defiProvider'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    blockNumber: 18471029,
    input: {
      userAddress: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    blockNumber: 16628151,
    input: {
      userAddress: '0x4bfb33d65f4167ebe190145939479227e7bf2cb0',
      timePeriod: TimePeriod.oneDay,
    },
  },
]
