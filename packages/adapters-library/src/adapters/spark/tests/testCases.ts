import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',

      filterProtocolTokens: ['0x59cD1C87501baa753d0B5B5Ab5D8416A45cD71DB'],
    },

    blockNumber: 20112246,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: ['0x59cD1C87501baa753d0B5B5Ab5D8416A45cD71DB'],
    },

    blockNumber: 20112246,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: [
      '0x59cD1C87501baa753d0B5B5Ab5D8416A45cD71DB',
      '0x12B54025C112Aa61fAce2CDB7118740875A566E9',
    ],

    blockNumber: 20112246,
  },

  {
    method: 'tx-params',
    key: 'supply',
    chainId: Chain.Ethereum,
    input: {
      productId: 'sp-token',
      action: WriteActions.Deposit,
      inputs: {
        asset: '0x59cD1C87501baa753d0B5B5Ab5D8416A45cD71DB',
        amount: '10000000000000000000',
        onBehalfOf: '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',
        referralCode: 0,
      },
    },
  },
  {
    method: 'tx-params',
    key: 'borrow',
    chainId: Chain.Ethereum,
    input: {
      productId: 'sp-token',
      action: WriteActions.Borrow,
      inputs: {
        asset: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        amount: '10000000000000000000',
        interestRateMode: 1,
        referralCode: 0,
        onBehalfOf: '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'withdraw',
    chainId: Chain.Ethereum,
    input: {
      productId: 'sp-token',
      action: WriteActions.Withdraw,
      inputs: {
        asset: '0x59cD1C87501baa753d0B5B5Ab5D8416A45cD71DB',
        amount: '10000000000000000000',
        to: '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'repay',
    chainId: Chain.Ethereum,
    input: {
      productId: 'sp-token',
      action: WriteActions.Repay,
      inputs: {
        asset: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        amount: '10000000000000000000',
        interestRateMode: 1,
        onBehalfOf: '0xf8dE75c7B95edB6f1E639751318f117663021Cf0',
      },
    },
  },
]
