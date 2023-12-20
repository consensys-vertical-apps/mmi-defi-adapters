import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0xD19f62b5A721747A04b969C90062CBb85D4aAaA8',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'profits',
    input: {
      userAddress: '0xD19f62b5A721747A04b969C90062CBb85D4aAaA8',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'tvl',
  },
  {
    chainId: Chain.Linea,
    method: 'deposits',
    input: {
      userAddress: '0xD19f62b5A721747A04b969C90062CBb85D4aAaA8',
      fromBlock: 0,
      toBlock: 1279785,
      protocolTokenAddress: '0x90d8053f7e29faaf5189bdce796a516e29f1f5d3',
      productId: 'pool',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'withdrawals',
    input: {
      userAddress: '0xD19f62b5A721747A04b969C90062CBb85D4aAaA8',
      fromBlock: 0,
      toBlock: 1279785,
      protocolTokenAddress: '0x90d8053f7e29faaf5189bdce796a516e29f1f5d3',
      productId: 'pool',
    },
  },
]
