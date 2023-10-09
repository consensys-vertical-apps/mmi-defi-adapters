import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
    },
  },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
  //     timePeriod: TimePeriod.oneDay,
  //   },
  // },
]
