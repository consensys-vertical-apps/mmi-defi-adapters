import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x426c4966fC76Bf782A663203c023578B744e4C5E',
      filterProtocolTokens: ['0x59d9356e565ab3a36dd77763fc0d87feaf85508c'],
    },

    blockNumber: 20686474,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x426c4966fC76Bf782A663203c023578B744e4C5E',

      filterProtocolTokens: ['0x59d9356e565ab3a36dd77763fc0d87feaf85508c'],
    },

    blockNumber: 20686512,
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x426c4966fC76Bf782A663203c023578B744e4C5E',
      fromBlock: 20672435,
      toBlock: 20680160,
      protocolTokenAddress: '0x59d9356e565ab3a36dd77763fc0d87feaf85508c',
      productId: 'usdm',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xe00a02F34f6de0080434267e0Ee2AB467FD16cE3',
      fromBlock: 19654044 - 10,
      toBlock: 19654044 + 3000,
      protocolTokenAddress: '0x57f5e098cad7a3d1eed53991d4d66c45c9af7812',
      productId: 'wusdm',
    },
  },
  {
    key: 'usdm',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x59d9356e565ab3a36dd77763fc0d87feaf85508c',
    blockNumber: 20686564,
  },
  {
    key: 'wusdm',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x57f5e098cad7a3d1eed53991d4d66c45c9af7812',
    blockNumber: 20686564,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: [
      '0x59d9356e565ab3a36dd77763fc0d87feaf85508c',
      '0x57f5e098cad7a3d1eed53991d4d66c45c9af7812',
    ],

    blockNumber: 19661884,
  },
]
