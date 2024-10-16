import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'
import { WriteActions } from '../../../../../types/writeActions'

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
      userAddress: '0xee46ee0dE21937772291a006c3541aFa557dc9B8',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: [
        '0x5Ee5bf7ae06D1Be5997A1A72006FE6C607eC6DE8',
        '0x5E8C8A7243651DB1384C0dDfDbE39761E8e7E51a',
        '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
        '0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE',
      ],
    },

    blockNumber: 19818884,
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
