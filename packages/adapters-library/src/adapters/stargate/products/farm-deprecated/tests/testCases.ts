import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: '1',
    input: {
      userAddress: '0x6372baD16935878713e5e1DD92EC3f7A3C48107E',
      filterProtocolTokens: ['0x892785f33CdeE22A30AEF750F285E18c18040c3e'],
    },

    blockNumber: 268835087,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    key: '2',
    input: {
      userAddress: '0x37914E1CAF9E5A1A69b5BcD56AAd46Ca0c167949',
    },

    blockNumber: 268839445,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'deposits',

    input: {
      userAddress: '0x37914E1CAF9E5A1A69b5BcD56AAd46Ca0c167949',
      protocolTokenAddress: '0x892785f33cdee22a30aef750f285e18c18040c3e',
      fromBlock: 81518984,
      toBlock: 81518984,
    },
  },

  {
    chainId: Chain.Arbitrum,
    method: 'withdrawals',

    input: {
      userAddress: '0x37914E1CAF9E5A1A69b5BcD56AAd46Ca0c167949',
      protocolTokenAddress: '0x892785f33cdee22a30aef750f285e18c18040c3e',
      fromBlock: 174348506,
      toBlock: 174348506,
    },
  },
]
