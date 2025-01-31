import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'
import { WriteActions } from '../../../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    key: 'supply',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xe141062f056c612a3f013d354ab89edadaf38ffd',

      filterProtocolTokens: [
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
        '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
      ],
    },

    blockNumber: 19383091,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xe141062f056c612a3f013d354ab89edadaf38ffd',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: ['0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5'],
    },
    blockNumber: 19383091,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x54C2778651e055C40D1af89C33276ec61DbDa73C',
      fromBlock: 19381542,
      toBlock: 19381542,
      protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0xbEDba47B926b45938A1a8ADFe6189047DD4e9bbC',
      fromBlock: 19382067,
      toBlock: 19382067,
      protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
    blockNumber: 19661878,
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
      },
    },
  },
  {
    method: 'tx-params',
    key: 'borrow',
    chainId: Chain.Ethereum,
    input: {
      action: 'borrow',
      inputs: {
        asset: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        amount: '10000000000000000000',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'repay',
    chainId: Chain.Ethereum,
    input: {
      action: 'repay',
      inputs: {
        asset: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        amount: '10000000000000000000',
      },
    },
  },
]
