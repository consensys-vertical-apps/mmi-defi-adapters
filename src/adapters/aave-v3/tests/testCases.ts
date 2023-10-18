import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0x9957d6f3d37382c59db20e3cabe3e4540b52bba2',
    },
    blockNumber: 140029880,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'profits',
    input: {
      userAddress: '0x9957d6f3d37382c59db20e3cabe3e4540b52bba2',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 140029883,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'tvl',
    blockNumber: 140029886,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'apr',
    blockNumber: 140029892,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'apy',
    blockNumber: 140029896,
  },
]
