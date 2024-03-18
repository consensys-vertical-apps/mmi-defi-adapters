import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x3Aa3Fd1B762CaC519D405297CE630beD30430b00',
      filterProtocolTokens: [
        '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
        '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      ],
    },
    blockNumber: 19462339,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions-historical',
    input: {
      userAddress: '0x3Aa3Fd1B762CaC519D405297CE630beD30430b00',
      filterProtocolTokens: [
        '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
        '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      ],
    },
    blockNumber: 19400000,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 19462339,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 19462339,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 19462339,
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x3Aa3Fd1B762CaC519D405297CE630beD30430b00',
      fromBlock: 19400000,
      toBlock: 19462339,
      protocolTokenAddress: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
      productId: 'ethena',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x3Aa3Fd1B762CaC519D405297CE630beD30430b00',
      fromBlock: 19400000,
      toBlock: 19462339,
      protocolTokenAddress: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
      productId: 'ethena',
    },
  },
]
