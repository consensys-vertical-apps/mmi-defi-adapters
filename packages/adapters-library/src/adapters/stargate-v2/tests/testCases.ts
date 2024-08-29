import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    key: 'lp-positions',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x006fbb8a8aeb9982b54ec213a675a19b121b3423',
      filterProtocolTokens: ['0xfcb42A0e352a08AbD50b8EE68d01f581B6Dfd80A'],
    },

    blockNumber: 20636813,
  },
  {
    key: 'lp-positions',
    chainId: Chain.Base,
    method: 'positions',

    input: {
      userAddress: '0x006fbb8a8aeb9982b54ec213a675a19b121b3423',
      filterProtocolTokens: ['0x98fB8522d891F43B771e2d27367b41Ba138D0B80'],
    },

    blockNumber: 19088200,
  },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0xCEadFdCCd0E8E370D985c49Ed3117b2572243A4a',
  //     timePeriod: TimePeriod.oneDay,
  //   },
  // },
  // {
  //   method: 'tx-params',
  //   key: 'supply',
  //   chainId: Chain.Ethereum,
  //   input: {
  //     productId: 'lp-staking',
  //     action: WriteActions.Deposit,
  //     inputs: {
  //       asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  //       amount: '10000000000000000000',
  //     },
  //   },
  // },
]
