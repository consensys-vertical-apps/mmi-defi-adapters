import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xb5b29320d2Dde5BA5BAFA1EbcD270052070483ec',
    },
    blockNumber: 18761230,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xb5b29320d2Dde5BA5BAFA1EbcD270052070483ec',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18761230,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18761230,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 18761230,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 18761230,
  },
]
