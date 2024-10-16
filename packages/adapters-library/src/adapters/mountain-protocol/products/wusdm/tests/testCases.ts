import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
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
