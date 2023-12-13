import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',
    },
    blockNumber: 18776256,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18776256,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18776256,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 18776256,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 18776256,
  },
]
