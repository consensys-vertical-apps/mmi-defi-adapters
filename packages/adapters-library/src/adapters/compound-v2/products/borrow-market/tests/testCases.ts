import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'supply',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xe141062f056c612a3f013d354ab89edadaf38ffd',

      filterProtocolTokens: [
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
        '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
      ],
    },

    blockNumber: 19383091,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xe141062f056c612a3f013d354ab89edadaf38ffd',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: ['0x39AA39c021dfbaE8faC545936693aC917d5E7563'],
    },
    blockNumber: 19383091,
  },
  {
    key: 'erc20-borrow',
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0xF0163f66Ec80DDA288E753E0A62c8Eb71cd38684',
      fromBlock: 19380990,
      toBlock: 19380990,
      protocolTokenAddress: '0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9',
    },
  },
  {
    key: 'eth-borrow',
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0x2178e1d614FEFb2B304DB58f07116d89f948Fda1',
      fromBlock: 19380684,
      toBlock: 19380684,
      protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    },
  },
  {
    key: 'erc20-repay',
    chainId: Chain.Ethereum,
    method: 'repays',
    input: {
      userAddress: '0x9C483fa4D84a218940BFA02652FCAF01EE8F44F2',
      fromBlock: 19383945,
      toBlock: 19383945,
      protocolTokenAddress: '0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9',
    },
  },
  {
    key: 'eth-repay',
    chainId: Chain.Ethereum,
    method: 'repays',
    input: {
      userAddress: '0x660a6d7eE594b207139999cDD8f03217D193C7fA',
      fromBlock: 19274060,
      toBlock: 19274060,
      protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    },
  },
]
