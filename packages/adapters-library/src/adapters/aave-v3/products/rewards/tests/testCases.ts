import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: 'reward',

    input: {
      userAddress: '0x5d14d2fc18f592b0fe5f6ce1ae091380294dcf71',
      filterProtocolTokens: ['0x929EC64c34a17401F460460D4B9390518E5B473e'],
    },

    blockNumber: 264107941,
  },
  {
    key: 'lido-market',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xb83F1688C0b7ebb155a830ae78F71527Ef55e759',
      filterProtocolTokens: ['0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb'],
    },

    blockNumber: 21330297,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'profits',

    input: {
      userAddress: '0x5d14d2fc18f592b0fe5f6ce1ae091380294dcf71',
      filterProtocolTokens: ['0x929EC64c34a17401F460460D4B9390518E5B473e'],
      timePeriod: TimePeriod.thirtyDays,
    },

    blockNumber: 265042912,
  },

  {
    method: 'withdrawals',
    key: 'withdrawals',
    chainId: Chain.Arbitrum,
    input: {
      userAddress: '0xb43F7be1CbBB7c96AeAEaff4598044052a8A2097',
      fromBlock: 265042452,
      toBlock: 265042452,
      protocolTokenAddress: '0x929EC64c34a17401F460460D4B9390518E5B473e',
    },
  },
]
