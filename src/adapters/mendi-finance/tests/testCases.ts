import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x61e17c36c0f177c6a46f9ae531e621d18c1acd93',
    },
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'profits',
    input: {
      userAddress: '0x61e17c36c0f177c6a46f9ae531e621d18c1acd93',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'prices',
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'tvl',
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'apy',
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'apr',
    blockNumber: 1597881,
  },
]
