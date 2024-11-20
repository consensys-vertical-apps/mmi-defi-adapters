import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'apx-eth-positions',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xa5cCBD739e7f5662b95D269ee9A48a37cBFb88Bc',
      filterProtocolTokens: ['0x9Ba021B0a9b958B5E75cE9f6dff97C7eE52cb3E6'],
    },
    blockNumber: 21202764,
  },
  {
    key: 'apx-eth-profits',
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xa5cCBD739e7f5662b95D269ee9A48a37cBFb88Bc',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x9Ba021B0a9b958B5E75cE9f6dff97C7eE52cb3E6'],
    },
    blockNumber: 21202764,
  },
  {
    key: 'apx-eth-prices',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x9Ba021B0a9b958B5E75cE9f6dff97C7eE52cb3E6',
    blockNumber: 21202764,
  },
  {
    key: 'apx-eth-tvl',
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0x9Ba021B0a9b958B5E75cE9f6dff97C7eE52cb3E6'],
    blockNumber: 21202764,
  },
  {
    key: 'apx-eth-deposits',
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xa5cCBD739e7f5662b95D269ee9A48a37cBFb88Bc',
      fromBlock: 21023794 - 1,
      toBlock: 21023794 + 1,
      protocolTokenAddress: '0x9Ba021B0a9b958B5E75cE9f6dff97C7eE52cb3E6',
    },
  },
]
