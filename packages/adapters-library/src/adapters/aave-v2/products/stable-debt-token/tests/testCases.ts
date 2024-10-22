import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0xe91D55AB2240594855aBd11b3faAE801Fd4c4687'],
    blockNumber: 19661875,
  },
]
