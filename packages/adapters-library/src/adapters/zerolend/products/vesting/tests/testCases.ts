import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    key: 'vesting',

    input: {
      userAddress: '0x67e5cc743aF5B1b4446c44fCCDc3aAe21f844AcF',

      openingPositionTxHash:
        '0xb0869c1296fdc398f47f920353ab0f86f6bb9f07997822c75d85e0acd412f694',
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
      openingPositionTxHash:
        '0x7d601172027411d1122201645cacb37100f3ce303eb6d6e49e45474ed7f48aab',
      filterProtocolTokens: ['0xf374229a18ff691406f99CCBD93e8a3f16B68888'],
    },

    blockNumber: 12844441,
  },
]
