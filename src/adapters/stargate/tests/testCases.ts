import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
    },
    blockNumber: 18163124,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18163965,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x2C5D4A0943e9cF4C597a76464396B0bF84C24C45',
      fromBlock: 17719334,
      toBlock: 17719336,
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x4Ffc5F22770ab6046c8D66DABAe3A9CD1E7A03e7',
      fromBlock: 17979753,
      toBlock: 17979755,
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    blockNumber: 18163124,
  },
]
