import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'px-eth-positions',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xF9F7AcA75cf438CE22184331a66591A02dF3a216',
      filterProtocolTokens: ['0x04C154b66CB340F3Ae24111CC767e0184Ed00Cc6'],
    },
    blockNumber: 21202764,
  },
  {
    key: 'apx-eth-prices',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x04C154b66CB340F3Ae24111CC767e0184Ed00Cc6',
    blockNumber: 21202764,
  },
]
