import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'
import { WriteActions } from '../../../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x61e17C36c0f177c6A46F9Ae531E621D18c1aCD93',

      filterProtocolTokens: [
        '0x333D8b480BDB25eA7Be4Dd87EEB359988CE1b30D',
        '0xf669C3C03D9fdF4339e19214A749E52616300E89',
        '0xAd7f33984bed10518012013D4aB0458D37FEE6F3',
        '0x9be5e24F05bBAfC28Da814bD59284878b388a40f',
      ],
    },
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'positions',
    key: 'with-borrow',

    input: {
      userAddress: '0x5Cd2d1EA68d962d4687B47604b062156c23E5889',

      filterProtocolTokens: [
        '0xf669C3C03D9fdF4339e19214A749E52616300E89',
        '0xAd7f33984bed10518012013D4aB0458D37FEE6F3',
        '0x8a90D208666Deec08123444F67Bf5B1836074a67',
      ],
    },

    blockNumber: 10441623,
  },
  {
    chainId: Chain.Linea,
    method: 'profits',
    input: {
      userAddress: '0x61e17C36c0f177c6A46F9Ae531E621D18c1aCD93',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: [
        '0x333D8b480BDB25eA7Be4Dd87EEB359988CE1b30D',
        '0xf669C3C03D9fdF4339e19214A749E52616300E89',
        '0xAd7f33984bed10518012013D4aB0458D37FEE6F3',
        '0x9be5e24F05bBAfC28Da814bD59284878b388a40f',
      ],
    },
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'prices',
    filterProtocolToken: '0x333D8b480BDB25eA7Be4Dd87EEB359988CE1b30D',
    blockNumber: 3717652,
  },
  {
    chainId: Chain.Linea,
    method: 'tvl',
    filterProtocolTokens: ['0x333D8b480BDB25eA7Be4Dd87EEB359988CE1b30D'],
    blockNumber: 3717652,
  },
  {
    method: 'tx-params',
    key: 'supply',
    chainId: Chain.Linea,
    input: {
      productId: 'supply-market',
      action: WriteActions.Deposit,
      inputs: {
        asset: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
        amount: '10000000000000000000',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'withdraw',
    chainId: Chain.Linea,
    input: {
      productId: 'supply-market',
      action: WriteActions.Withdraw,
      inputs: {
        asset: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
        amount: '10000000000000000000',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'borrow',
    chainId: Chain.Linea,
    input: {
      productId: 'borrow-market',
      action: 'borrow',
      inputs: {
        asset: '0x333D8b480BDB25eA7Be4Dd87EEB359988CE1b30D',
        amount: '10000000000000000000',
      },
    },
  },
  {
    method: 'tx-params',
    key: 'repay',
    chainId: Chain.Linea,
    input: {
      productId: 'borrow-market',
      action: 'repay',
      inputs: {
        asset: '0x333D8b480BDB25eA7Be4Dd87EEB359988CE1b30D',
        amount: '10000000000000000000',
      },
    },
  },
]
