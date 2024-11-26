import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    key: 'moo-token',
    method: 'positions',

    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: ['0x5dA90BA82bED0AB701E6762D2bF44E08634d9776'],
    },

    blockNumber: 21270814,
  },
]
