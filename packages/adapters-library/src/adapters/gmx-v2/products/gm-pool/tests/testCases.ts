import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    key: 'gmx-usdc',
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0x7a8FEaAdBA4360697228aA9b2a5EBaa769F68905',

      filterProtocolTokens: ['0x55391D178Ce46e7AC8eaAEa50A72D1A5a8A622Da'],
    },

    blockNumber: 276402599,
  },
  {
    key: 'weth',
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0x7a8FEaAdBA4360697228aA9b2a5EBaa769F68905',

      filterProtocolTokens: ['0x450bb6774Dd8a756274E0ab4107953259d2ac541'],
    },

    blockNumber: 276402599,
  },
]
