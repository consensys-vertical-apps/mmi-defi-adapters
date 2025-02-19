import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Polygon,
    method: 'positions',

    input: {
      userAddress: '0x947b7d38421E2701852246Cf18EF6AE19C299BF3',
      filterProtocolTokens: ['0x958d208Cdf087843e9AD98d23823d32E17d723A1'],
    },

    blockNumber: 65028666,
  },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0xCEadFdCCd0E8E370D985c49Ed3117b2572243A4a',
  //     timePeriod: TimePeriod.oneDay,
  //   },
  // },
]
