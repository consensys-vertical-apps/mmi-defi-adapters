import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    key: 'vesting',

    input: {
      userAddress: '0x67e5cc743aF5B1b4446c44fCCDc3aAe21f844AcF',

      filterProtocolTokens: ['0xf374229a18ff691406f99CCBD93e8a3f16B68888'],
    },

    blockNumber: 12844440,
  },
  {
    chainId: Chain.Linea,
    method: 'positions',
    key: 'vesting-2',

    input: {
      userAddress: '0x3130d2b8cbf0798bb1cbf2a4f527dbae953ff27f',
      filterProtocolTokens: ['0xf374229a18ff691406f99CCBD93e8a3f16B68888'],
    },

    blockNumber: 12844441,
  },
]
