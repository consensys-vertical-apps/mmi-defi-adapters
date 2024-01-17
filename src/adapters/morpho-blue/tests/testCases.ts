<<<<<<< Updated upstream
import type { TestCase } from '../../../types/testCase'

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
=======
import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
    },
    blockNumber: 19025472,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 19025472,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 19025472,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 19025472,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 19025472,
  },
>>>>>>> Stashed changes
]
