import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
    },
    blockNumber: 18733080,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18733080,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18733080,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 18733080,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 18733080,
  },
]
