import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0x9957d6f3d37382c59db20e3cabe3e4540b52bba2',
    },
    blockNumber: 142290717,
  },

  {
    chainId: Chain.Arbitrum,
    method: 'profits',
    input: {
      userAddress: '0x9957d6f3d37382c59db20e3cabe3e4540b52bba2',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 142290717,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'tvl',
    blockNumber: 142290717,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'apr',
    blockNumber: 142290717,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'apy',
    blockNumber: 142290717,
  },
  {
    method: 'tx-params',
    key: 'supply',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: 'supply',
      inputs: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '10000000000000000000',
        '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
        0,
      ],
    },
  },
  {
    method: 'tx-params',
    key: 'borrow',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: 'borrow',
      inputs: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '10000000000000000000',
        1,
        0,
        '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
      ],
    },
  },
  {
    method: 'tx-params',
    key: 'withdraw',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: 'withdraw',
      inputs: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '10000000000000000000',
        '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
      ],
    },
  },
  {
    method: 'tx-params',
    key: 'repay',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: 'repay',
      inputs: [
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '10000000000000000000',
        1,
        '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
      ],
    },
  },
]
