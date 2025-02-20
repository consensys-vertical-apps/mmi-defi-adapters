import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'reth',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
      filterProtocolTokens: ['0xae78736Cd615f374D3085123A210448E74Fc6393'],
    },
    blockNumber: 19074240,
  },

  {
    key: 'reth',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    blockNumber: 19661887,
  },
]
