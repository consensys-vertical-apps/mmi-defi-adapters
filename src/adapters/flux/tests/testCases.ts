import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
      timePeriod: TimePeriod.oneDay,
    },
  },
]
