import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x0000000000000000000000000000000000000000',
    blockNumber: 18814107,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    key: '2',
    filterProtocolToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    blockNumber: 18814107,
  },
  {
    chainId: Chain.Polygon,
    method: 'prices',
    key: '3',
    filterProtocolToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    blockNumber: 51278245,
  },
]
