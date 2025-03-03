import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x278a8453ECf2f477a5Ab3Cd9b0Ea410b7B2C4182',
      filterProtocolTokens: ['0xC128a9954e6c874eA3d62ce62B468bA073093F25'],
    },
    blockNumber: 21194060,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '2',
    input: {
      userAddress: '0x891ca7e61d3868B9eDbF20dDd045Fc7D579E77d5',
      filterProtocolTokens: ['0xC128a9954e6c874eA3d62ce62B468bA073093F25'],
    },
    blockNumber: 21194060,
  },
]
