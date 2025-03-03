import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',

      filterProtocolTokens: [
        '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
        '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        '0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9',
      ],
    },
    blockNumber: 18776256,
  },
]
