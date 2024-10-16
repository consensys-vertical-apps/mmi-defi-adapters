import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
      filterProtocolTokens: ['0x465a5a630482f3abD6d3b84B39B29b07214d19e5'],
    },
    blockNumber: 19321516,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x465a5a630482f3abD6d3b84B39B29b07214d19e5'],
    },
    blockNumber: 19321516,
  },
  {
    chainId: Chain.Ethereum,
    method: 'repays',
    input: {
      userAddress: '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
      fromBlock: 14535107,
      toBlock: 19321516,
      protocolTokenAddress: '0x465a5a630482f3abD6d3b84B39B29b07214d19e5',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0xd73B2cA04C6392df262dd756d3E4e27ad32308A6',
      fromBlock: 14535107,
      toBlock: 19321516,
      protocolTokenAddress: '0x465a5a630482f3abD6d3b84B39B29b07214d19e5',
    },
  },
]
