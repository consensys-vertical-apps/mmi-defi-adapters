import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781',
    },
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 18183880,
  },
]
