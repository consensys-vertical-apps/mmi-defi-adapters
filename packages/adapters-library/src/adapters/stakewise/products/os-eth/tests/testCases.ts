import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

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
    method: 'tvl',
    filterProtocolTokens: [protocolTokenAddress],
    blockNumber: 19661887,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress,
      protocolTokenAddress,
      toBlock: 19240233 + 1,
      fromBlock: 19240233 - 1,
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress,

      filterProtocolTokens: [protocolTokenAddress],
    },
    blockNumber: 19261916,
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress,
      protocolTokenAddress,
      toBlock: 19261916 + 1,
      fromBlock: 19261916 - 1,
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: protocolTokenAddress,
    blockNumber: 19661887,
  },
]
