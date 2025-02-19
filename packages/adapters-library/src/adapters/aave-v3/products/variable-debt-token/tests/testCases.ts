import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

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

      filterProtocolTokens: ['0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE'],
    },

    blockNumber: 19818884,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: ['0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8'],

    blockNumber: 19818582,
  },
]
