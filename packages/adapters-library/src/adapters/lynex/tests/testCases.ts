import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

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
    method: 'deposits',
    input: {
      userAddress: '0x466fE5825B096cEF0f4B3C2E9B4185e042c6E4f0',
      fromBlock: 3548759,
      toBlock: 5184581,
      protocolTokenAddress: '0x5D3D9E20ad27dd61182505230D1bD075bd249E4B',
      productId: 'algebra',
      tokenId: '1852',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'withdrawals',
    input: {
      userAddress: '0x466fE5825B096cEF0f4B3C2E9B4185e042c6E4f0',
      fromBlock: 3549097,
      toBlock: 5185599,
      protocolTokenAddress: '0x5D3D9E20ad27dd61182505230D1bD075bd249E4B',
      productId: 'algebra',
      tokenId: '1852',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'profit',
    method: 'profits',
    input: {
      userAddress: '0x466fE5825B096cEF0f4B3C2E9B4185e042c6E4f0',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0x5D3D9E20ad27dd61182505230D1bD075bd249E4B'],
      filterTokenIds: ['1852'],
    },
    blockNumber: 5084581,
  },
]
