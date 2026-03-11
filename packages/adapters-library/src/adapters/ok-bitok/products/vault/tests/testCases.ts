import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: 'funded-user',
    input: {
      userAddress: '0x324672b347913fb084381505434ce514bfC77102',
      filterProtocolTokens: ['0xD772A28caf98cCF3c774c704cA9514A4914b50A0'],
    },
    blockNumber: 440517222,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: 'empty-user',
    input: {
      userAddress: '0xe49D7b395fcf5CeEE16337B40f306F3A36bcb959',
      filterProtocolTokens: ['0xD772A28caf98cCF3c774c704cA9514A4914b50A0'],
    },
    blockNumber: 440517222,
  },
]
