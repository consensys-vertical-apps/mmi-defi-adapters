import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x1ADB67a4C80A760579378624714DC01b89E69549',
    },
    blockNumber: 18670429,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x1ADB67a4C80A760579378624714DC01b89E69549',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18670429,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18670429,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 18670429,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 18670429,
  },
]
