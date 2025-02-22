import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xb5b29320d2Dde5BA5BAFA1EbcD270052070483ec',

      filterProtocolTokens: [
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
        '0x0B925eD163218f6662a35e0f0371Ac234f9E9371',
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
      ],
    },
    blockNumber: 18761230,
  },
]
