import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x4f575BDdc36c3Ec42D923AEeEc4Ada1a60ce4086',

      filterProtocolTokens: [
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
        '0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8',
      ],
    },

    blockNumber: 19818581,
  },

  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x4f575BDdc36c3Ec42D923AEeEc4Ada1a60ce4086',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: [
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
        '0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8',
      ],
    },

    blockNumber: 19818581,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: [
      '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
      '0x0B925eD163218f6662a35e0f0371Ac234f9E9371',
      '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    ],

    blockNumber: 19818582,
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
