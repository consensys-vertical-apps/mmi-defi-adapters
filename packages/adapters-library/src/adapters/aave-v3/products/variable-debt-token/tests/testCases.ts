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
]
