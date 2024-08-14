import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x7BFEe91193d9Df2Ac0bFe90191D40F23c773C060',
      filterProtocolTokens: ['0x7A56E1C57C7475CCf742a1832B028F0456652F97'],
    },

    blockNumber: 20520223,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0x7BFEe91193d9Df2Ac0bFe90191D40F23c773C060',
      filterProtocolTokens: ['0x3647c54c4c2C65bC7a2D63c0Da2809B399DBBDC0'],
    },

    blockNumber: 242460102,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'profits',

    input: {
      userAddress: '0xd87D6D2D766b15cDA45e3cACC8742104B5A921ea',
      filterProtocolTokens: ['0x3647c54c4c2C65bC7a2D63c0Da2809B399DBBDC0'],
    },

    blockNumber: 242737820,
  },
]
