import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x00000000863b56a3c1f0f1be8bc4f8b7bd78f57a',
      filterProtocolTokens: ['0x7f72E0D8e9AbF9133A92322b8B50BD8e0F9dcFCB'],
    },
    blockNumber: 1175771,
  },
]
