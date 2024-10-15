import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    key: 'cow-token',
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: ['0xA297024a99098d52aae466AC5F48520d514262bA'],
    },
    blockNumber: 228323745,
  },
]
