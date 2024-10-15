import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

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

  {
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781',
      fromBlock: 19262682 - 1,
      toBlock: 19262682 + 1,
      protocolTokenAddress: '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec',
    },
  },
]
