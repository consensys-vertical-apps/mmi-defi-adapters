import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'farming',
    input: {
      userAddress: '0x9e3F12527831E59760D79E17a36CE695998F2afB',
      filterProtocolTokens: ['0x275dF57d2B23d53e20322b4bb71Bf1dCb21D0A00'],
    },

    blockNumber: 21271033,
  },
]
