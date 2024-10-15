import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x426c4966fC76Bf782A663203c023578B744e4C5E',
      filterProtocolTokens: ['0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C'],
    },

    blockNumber: 20686474,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x426c4966fC76Bf782A663203c023578B744e4C5E',

      filterProtocolTokens: ['0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C'],
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
      protocolTokenAddress: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xe00a02F34f6de0080434267e0Ee2AB467FD16cE3',
      fromBlock: 19654044 - 10,
      toBlock: 19654044 + 3000,
      protocolTokenAddress: '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812',
    },
  },
  {
    key: 'usdm',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
    blockNumber: 20686564,
  },
  {
    key: 'wusdm',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812',
    blockNumber: 20686564,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: [
      '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
      '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812',
    ],

    blockNumber: 19661884,
  },
]
