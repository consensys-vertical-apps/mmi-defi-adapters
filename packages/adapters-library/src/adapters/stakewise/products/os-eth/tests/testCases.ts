import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

const userAddress = '0x96E9a50A3b8B4AE1fAB47f26C3F78E148563380A'
const protocolTokenAddress = '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress,

      filterProtocolTokens: [protocolTokenAddress],
    },
    blockNumber: 19240234,
  },

  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: protocolTokenAddress,
    blockNumber: 19661887,
  },
]
