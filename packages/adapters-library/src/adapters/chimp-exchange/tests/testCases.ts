import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0xe510668b3f77f4d3be91072fd484f2e6134e65ff',
      filterProtocolTokens: ['0x90D8053f7E29FaAF5189BdcE796a516E29F1F5d3'],
    },
    blockNumber: 1498597,
  },
  {
    chainId: Chain.Linea,
    method: 'profits',
    input: {
      userAddress: '0xe510668b3f77f4d3be91072fd484f2e6134e65ff',
      filterProtocolTokens: ['0x90D8053f7E29FaAF5189BdcE796a516E29F1F5d3'],
    },
    blockNumber: 1498597,
  },
  {
    chainId: Chain.Linea,
    method: 'tvl',
    filterProtocolTokens: ['0x90D8053f7E29FaAF5189BdcE796a516E29F1F5d3'],
    blockNumber: 1498597,
  },
  {
    chainId: Chain.Linea,
    method: 'deposits',
    input: {
      userAddress: '0xD19f62b5A721747A04b969C90062CBb85D4aAaA8',
      fromBlock: 750000,
      toBlock: 850000,
      protocolTokenAddress: '0x90d8053f7e29faaf5189bdce796a516e29f1f5d3',
      productId: 'pool',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'withdrawals',
    input: {
      userAddress: '0xb84c573f9d5492606727e54cd3f356a53b7a9262',
      fromBlock: 1340000,
      toBlock: 1498597,
      protocolTokenAddress: '0x90d8053f7e29faaf5189bdce796a516e29f1f5d3',
      productId: 'pool',
    },
  },
]
