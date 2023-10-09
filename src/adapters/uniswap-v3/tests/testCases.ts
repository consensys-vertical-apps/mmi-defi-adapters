import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
  //   },
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'deposits',
  //   input: {
  //     userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
  //     fromBlock: 18262162,
  //     toBlock: 18262163,
  //   },
  // },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
      timePeriod: TimePeriod.sevenDays,
    },
    blockNumber: 18241163,
  },
]
