import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

const User5 = '0xabef19a5Cb082D0e512eB28363B1229B25BaB9a7' // Has Holdings and Redemptions in some yield markets on Arbitrum

export const testCases: TestCase[] = [
  {
    key: 'user5',
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: User5,

      filterProtocolTokens: [
        '0x22799daa45209338b7f938edf251bdfd1e6dcb32',
        '0x22799daa45209338b7f938edf251bdfd1e6dcb32',
        '0x22799daa45209338b7f938edf251bdfd1e6dcb32',
        '0xe9bd233b2b34934fb83955ec15c2ac48f31a0e8c',
        '0xe9bd233b2b34934fb83955ec15c2ac48f31a0e8c',
      ],

      filterTokenIds: ['10334', '10484', '10566', '3136', '3137'],
    },

    blockNumber: 245491037,
  },
  {
    key: 'user5',
    chainId: Chain.Arbitrum,
    method: 'profits',

    input: {
      userAddress: User5,
      timePeriod: TimePeriod.thirtyDays,

      filterProtocolTokens: [
        '0xe9bD233b2b34934Fb83955EC15c2ac48F31A0E8c',
        '0xe9bD233b2b34934Fb83955EC15c2ac48F31A0E8c',
        '0x22799DAA45209338B7f938edf251bdfD1E6dCB32',
        '0x22799DAA45209338B7f938edf251bdfD1E6dCB32',
        '0x22799DAA45209338B7f938edf251bdfD1E6dCB32',
      ],

      filterTokenIds: ['3136', '3137', '10334', '10484', '10566'],
    },

    blockNumber: 246945289,
  },
]
