import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: [
      '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
      '0xe91D55AB2240594855aBd11b3faAE801Fd4c4687',
      '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec',
    ],
    blockNumber: 19661875,
  },
]
