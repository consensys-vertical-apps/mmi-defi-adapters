import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x0000000000000000000000000000000000000001',
    },
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x0x0000000000000000000000000000000000000001',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x0000000000000000000000000000000000000001',
      fromBlock: 18183580,
      toBlock: 18183880,
      protocolTokenAddress: '0x1000000000000000000000000000000000000001',
      product: 'example-pool',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x0000000000000000000000000000000000000001',
      fromBlock: 18183580,
      toBlock: 18183880,
      protocolTokenAddress: '0x1000000000000000000000000000000000000001',
      product: 'example-pool',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 18183880,
  },
]
