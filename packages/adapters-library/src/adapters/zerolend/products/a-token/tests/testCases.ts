import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'
import { WriteActions } from '../../../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x394F94ca8Dec8D0bD48c738AB28dCe146a67Bbd9',
      filterProtocolTokens: ['0xFb932A75c5F69d03B0F6e59573FDe6976aF0D88C'],
    },

    blockNumber: 20862963,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x394F94ca8Dec8D0bD48c738AB28dCe146a67Bbd9',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0xFb932A75c5F69d03B0F6e59573FDe6976aF0D88C'],
    },

    blockNumber: 20862963,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: [
      '0xFb932A75c5F69d03B0F6e59573FDe6976aF0D88C',
      '0x84E55c6Bc5B7e9505d87b3Df6Ceff7753e15A0c5',
      '0x68fD75cF5a91F49EFfAd0E857ef2E97e5d1f35e7',
    ],
    blockNumber: 19818582,
  },

  {
    method: 'tx-params',
    key: 'supply',
    chainId: Chain.Ethereum,
    input: {
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
