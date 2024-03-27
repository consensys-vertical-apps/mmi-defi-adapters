import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import { WriteActions } from '../../../types/getTransactionParamsInput'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0x9957d6f3d37382c59db20e3cabe3e4540b52bba2',

      filterProtocolTokens: [
        '0x078f358208685046a11C85e8ad32895DED33A249',
        '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
        '0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC',
      ],
    },
    blockNumber: 142290717,
  },

  {
    chainId: Chain.Arbitrum,
    method: 'profits',
    input: {
      userAddress: '0x9957d6f3d37382c59db20e3cabe3e4540b52bba2',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: [
        '0x078f358208685046a11C85e8ad32895DED33A249',
        '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
        '0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC',
      ],
    },
    blockNumber: 142290717,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'tvl',
    blockNumber: 142290717,
  },

  {
    method: 'tx-params',
    key: 'supply',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: WriteActions.Deposit,
      inputs: {
        asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '10000000000000000000',
        onBehalfOf: '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
        referralCode: 0,
      },
    },
  },
  {
    method: 'tx-params',
    key: 'borrow',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: WriteActions.Borrow,
      inputs: {
        asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '10000000000000000000',
        interestRateMode: 1,
        referralCode: 0,
        onBehalfOf: '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'withdraw',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: WriteActions.Withdraw,
      inputs: {
        asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '10000000000000000000',
        to: '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'repay',
    chainId: Chain.Ethereum,
    input: {
      productId: 'a-token',
      action: WriteActions.Repay,
      inputs: {
        asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amount: '10000000000000000000',
        interestRateMode: 1,
        onBehalfOf: '0x5B541d54e79052B34188db9A43F7b00ea8E2C4B1',
      },
    },
  },
]
