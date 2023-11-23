import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x9fcc67d7db763787bb1c7f3bc7f34d3c548c19fe',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x92832b0f4435e1c4510bd601727356b738c99312',
      fromBlock: 18419260,
      toBlock: 18619260,
      protocolTokenAddress: '0xf951E335afb289353dc249e82926178EaC7DEd78',
      productId: 'sw-eth',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
  },
]
