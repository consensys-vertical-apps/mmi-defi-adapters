import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xa66d568cd146c01ac44034a01272c69c2d9e4bab',
    },
    blockNumber: 18520799,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xa66d568cd146c01ac44034a01272c69c2d9e4bab',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18520799,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    blockNumber: 18520799,
  },

  {
    method: 'tx-params',
    key: 'supply',
    chainId: Chain.Ethereum,
    input: {
      productId: 'pool',
      action: 'supply',
      inputs: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '10000000000000000000',
      ],
    },
  },
  {
    method: 'tx-params',
    key: 'borrow',
    chainId: Chain.Ethereum,
    input: {
      productId: 'pool',
      action: 'borrow',
      inputs: [
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        '10000000000000000000',
      ],
    },
  },
  {
    method: 'tx-params',
    key: 'withdraw',
    chainId: Chain.Ethereum,
    input: {
      productId: 'pool',
      action: 'withdraw',
      inputs: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '10000000000000000000',
      ],
    },
  },
  {
    method: 'tx-params',
    key: 'repay',
    chainId: Chain.Ethereum,
    input: {
      productId: 'pool',
      action: 'repay',
      inputs: [
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        '10000000000000000000',
      ],
    },
  },
]
