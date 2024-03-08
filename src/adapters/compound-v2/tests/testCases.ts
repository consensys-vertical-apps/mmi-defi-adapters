import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  // {
  //   key: 'supply',
  //   chainId: Chain.Ethereum,
  //   method: 'positions',

  //   input: {
  //     userAddress: '0xe141062f056c612a3f013d354ab89edadaf38ffd',

  //     filterProtocolTokens: [
  //       '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //       '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
  //       '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
  //     ],
  //   },

  //   blockNumber: 19383091,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0xe141062f056c612a3f013d354ab89edadaf38ffd',
  //     timePeriod: TimePeriod.thirtyDays,

  //     filterProtocolTokens: [
  //       '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //       '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
  //       '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
  //     ],
  //   },
  //   blockNumber: 19383091,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'deposits',
  //   input: {
  //     userAddress: '0x54C2778651e055C40D1af89C33276ec61DbDa73C',
  //     fromBlock: 19381542,
  //     toBlock: 19381542,
  //     productId: 'supply-market',
  //     protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //   },
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'withdrawals',
  //   input: {
  //     userAddress: '0xbEDba47B926b45938A1a8ADFe6189047DD4e9bbC',
  //     fromBlock: 19382067,
  //     toBlock: 19382067,
  //     productId: 'supply-market',
  //     protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //   },
  // },
  {
    key: 'erc20-borrow',
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0xF0163f66Ec80DDA288E753E0A62c8Eb71cd38684',
      fromBlock: 19380990,
      toBlock: 19380990,
      productId: 'borrow-market',
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
      productId: 'borrow-market',
      protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    },
  },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'prices',
  //   blockNumber: 19383091,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0xa66d568cd146c01ac44034a01272c69c2d9e4bab',

  //     filterProtocolTokens: [
  //       '0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E',
  //       '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //     ],
  //   },
  //   blockNumber: 18520799,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0xa66d568cd146c01ac44034a01272c69c2d9e4bab',
  //     timePeriod: TimePeriod.oneDay,

  //     filterProtocolTokens: [
  //       '0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E',
  //       '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //     ],
  //   },
  //   blockNumber: 18520799,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'prices',
  //   blockNumber: 18520799,
  // },

  // {
  //   method: 'tx-params',
  //   key: 'supply',
  //   chainId: Chain.Ethereum,
  //   input: {
  //     productId: 'pool',
  //     action: 'supply',
  //     inputs: [
  //       '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  //       '10000000000000000000',
  //     ],
  //   },
  // },
  // {
  //   method: 'tx-params',
  //   key: 'borrow',
  //   chainId: Chain.Ethereum,
  //   input: {
  //     productId: 'pool',
  //     action: 'borrow',
  //     inputs: [
  //       '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //       '10000000000000000000',
  //     ],
  //   },
  // },
  // {
  //   method: 'tx-params',
  //   key: 'withdraw',
  //   chainId: Chain.Ethereum,
  //   input: {
  //     productId: 'pool',
  //     action: 'withdraw',
  //     inputs: [
  //       '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  //       '10000000000000000000',
  //     ],
  //   },
  // },
  // {
  //   method: 'tx-params',
  //   key: 'repay',
  //   chainId: Chain.Ethereum,
  //   input: {
  //     productId: 'pool',
  //     action: 'repay',
  //     inputs: [
  //       '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
  //       '10000000000000000000',
  //     ],
  //   },
  // },
]
