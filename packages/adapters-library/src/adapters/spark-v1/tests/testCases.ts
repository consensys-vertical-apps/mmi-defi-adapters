import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',
  //   },
  // },
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
  //     productId: 'sp-token',
  //     action: WriteActions.Deposit,
  //     inputs: {
  //       asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  //       amount: '10000000000000000000',
  //     },
  //   },
  // },
]
