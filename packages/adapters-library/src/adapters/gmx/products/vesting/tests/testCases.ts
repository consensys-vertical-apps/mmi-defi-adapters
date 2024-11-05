import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'vgmx',
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0xd03d26b36642c8137c77AE8fe91E205252db1095',
      filterProtocolTokens: ['0x199070DDfd1CFb69173aa2F7e20906F26B363004'],
    },

    blockNumber: 271347253,
  },
  {
    key: 'vglp',
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0xe480d4e05C8C32Dc3C00A20adD4560E482fc33B1',
      filterProtocolTokens: ['0xA75287d2f8b217273E7FCD7E86eF07D33972042E'],
    },

    blockNumber: 271347267,
  },
]
