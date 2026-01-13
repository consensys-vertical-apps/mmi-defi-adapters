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
    chainId: Chain.Linea,
    method: 'positions',

    input: {
      userAddress: '0x2F50cd2fB35A3f667f6BC0Ea77EF6ff32aF2B9Db',
      openingPositionTxHash:
        '0x9293e41ce141b59f89ef9082eb15817a40e1365e33cb0214a66cb4e0092e2421',
      filterProtocolTokens: ['0x8619b395fd96dcfe3f2711d8bf84b26338db0294'],
    },

    blockNumber: 27758460,
  },
]
