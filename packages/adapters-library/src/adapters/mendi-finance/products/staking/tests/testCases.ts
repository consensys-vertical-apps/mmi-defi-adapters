import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    key: 'staking',

    input: {
      userAddress: '0x3130D2b8cbf0798bb1cBf2a4F527dBaE953FF27f',
      filterProtocolTokens: ['0x150b1e51738CdF0cCfe472594C62d7D6074921CA'],
    },

    blockNumber: 12802108,
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
