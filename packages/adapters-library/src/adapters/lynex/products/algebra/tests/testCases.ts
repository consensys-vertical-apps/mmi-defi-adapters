import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x466fE5825B096cEF0f4B3C2E9B4185e042c6E4f0',

      filterProtocolTokens: [
        '0x5D3D9E20ad27dd61182505230D1bD075bd249E4B',
        '0x5D3D9E20ad27dd61182505230D1bD075bd249E4B',
        '0x5D3D9E20ad27dd61182505230D1bD075bd249E4B',
        '0x5D3D9E20ad27dd61182505230D1bD075bd249E4B',
        '0xAf453A22C59BC4796f78a176fDcc443CFD9Ab3C3',
      ],

      filterTokenIds: ['1852', '3148', '7622', '7627'],
    },
    blockNumber: 5184581,
  },
  {
    chainId: Chain.Linea,
    method: 'positions',
    key: '2',

    input: {
      userAddress: '0x4A4fbACCf1B987338252223fCe34FC02a98c9343',
      openingPositionTxHash:
        '0x3e3a226c437a151a5c0d6cde3383f32ffb531a0c3a726ba92cbeb5d4e12bbd48',
      filterProtocolTokens: ['0x5D3D9E20ad27dd61182505230D1bD075bd249E4B'],
    },

    blockNumber: 21119825,
  },
]
