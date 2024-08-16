import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

const User1 = '0x7BFEe91193d9Df2Ac0bFe90191D40F23c773C060' // Has some SolvBTC on Arbitrum
const User2 = '0xEBFAEEDE1D85E8E87BDe9326bc301830D55dfa8c' // Has some SolvBTC.BBN on Mainnet
const User3 = '0x423e5E0ee2615E6bef4B181400553066dAE3b6fD' // Has some SolvBTC.ENA on BSC
const User4 = '0xd87D6D2D766b15cDA45e3cACC8742104B5A921ea' // Has deposited + withdrew some SolvBTC over a few days

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
]
