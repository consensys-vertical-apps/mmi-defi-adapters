import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Bsc,
    method: 'positions',

    input: {
      userAddress: '0x53Dc97Eb9aFefBeBe3BF83aDD14fD812C69193FC',

      filterProtocolTokens: [
        '0x804678fa97d91B974ec2af3c843270886528a9E6',
        '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      ],
    },

    blockNumber: 36672150,
  },
]
