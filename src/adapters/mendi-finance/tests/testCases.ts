import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x61e17c36c0f177c6a46f9ae531e621d18c1acd93',

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
    method: 'profits',
    input: {
      userAddress: '0x61e17c36c0f177c6a46f9ae531e621d18c1acd93',
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
    blockNumber: 1597881,
  },
  {
    chainId: Chain.Linea,
    method: 'tvl',
    blockNumber: 1597881,
  },
]
