import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x4f575BDdc36c3Ec42D923AEeEc4Ada1a60ce4086',

      filterProtocolTokens: [
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
        '0x6df1C1E379bC5a00a7b4C6e67A203333772f45A8',
      ],
    },

    blockNumber: 19818581,
  },
  {
    key: 'lido-market',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xb83F1688C0b7ebb155a830ae78F71527Ef55e759',
      filterProtocolTokens: ['0xfA1fDbBD71B0aA16162D76914d69cD8CB3Ef92da'],
    },

    blockNumber: 21330292,
  },
]
