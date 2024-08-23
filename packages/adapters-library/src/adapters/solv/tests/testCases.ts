import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

const User1 = '0x7BFEe91193d9Df2Ac0bFe90191D40F23c773C060' // Has some SolvBTC on Arbitrum
const User2 = '0xEBFAEEDE1D85E8E87BDe9326bc301830D55dfa8c' // Has some SolvBTC.BBN on Mainnet
const User3 = '0x423e5E0ee2615E6bef4B181400553066dAE3b6fD' // Has some SolvBTC.ENA on BSC
const User4 = '0xd87D6D2D766b15cDA45e3cACC8742104B5A921ea' // Has deposited + withdrew some SolvBTC over a few days
const User5 = '0xabef19a5Cb082D0e512eB28363B1229B25BaB9a7' // Has Holdings and Redemptions in some yield markets on Arbitrum

export const testCases: TestCase[] = [
  {
    key: 'user1',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: User1,
      filterProtocolTokens: ['0x7A56E1C57C7475CCf742a1832B028F0456652F97'],
    },

    blockNumber: 20540523,
  },
  {
    key: 'user2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: User2,
      filterProtocolTokens: ['0xd9D920AA40f578ab794426F5C90F6C731D159DEf'],
    },

    blockNumber: 20540523,
  },
  {
    key: 'user2',
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: User2,
      timePeriod: TimePeriod.thirtyDays,
      filterProtocolTokens: ['0xd9D920AA40f578ab794426F5C90F6C731D159DEf'],
    },

    blockNumber: 20540523,
  },
  {
    key: 'user1',
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: User1,
      filterProtocolTokens: ['0x3647c54c4c2C65bC7a2D63c0Da2809B399DBBDC0'],
    },

    blockNumber: 243434198,
  },
  {
    key: 'user2',
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: User2,
      filterProtocolTokens: ['0x3647c54c4c2C65bC7a2D63c0Da2809B399DBBDC0'],
    },

    blockNumber: 243434209,
  },
  {
    key: 'user4',
    chainId: Chain.Arbitrum,
    method: 'profits',

    input: {
      userAddress: User4,
      timePeriod: TimePeriod.thirtyDays,
      filterProtocolTokens: ['0x3647c54c4c2C65bC7a2D63c0Da2809B399DBBDC0'],
    },

    blockNumber: 243434212,
  },
  {
    key: 'user3',
    chainId: Chain.Bsc,
    method: 'positions',

    input: {
      userAddress: User3,
      filterProtocolTokens: ['0x53E63a31fD1077f949204b94F431bCaB98F72BCE'],
    },

    blockNumber: 41411562,
  },
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
    chainId: Chain.Bsc,
    method: 'positions',

    input: {
      userAddress: User5,

      filterProtocolTokens: [
        '0xb816018e5d421e8b809a4dc01af179d86056ebdf',
        '0xe16cec2f385ea7a382772334a44506a865f98562',
      ],

      filterTokenIds: ['38288', '138'],
    },

    blockNumber: 41584905,
  },
]
