import { Chain } from '../../../defiProvider'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x9Cb4F2Da14F6d816e1f111F3F3183Aa41C4849f7',
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
