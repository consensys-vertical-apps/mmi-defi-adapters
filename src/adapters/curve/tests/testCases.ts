import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    blockNumber: 18471029,
    input: {
      userAddress: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
      filterProtocolTokens: ['0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'],
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    blockNumber: 186041228,
    input: {
      userAddress: '0x52f541764e6e90eebc5c21ff570de0e2d63766b6',

      filterProtocolTokens: [
        '0xCE5F24B7A95e9cBa7df4B54E911B4A3Dc8CDAf6f',
        '0x95285Ea6fF14F80A2fD3989a6bAb993Bd6b5fA13',
        '0xB08FEf57bFcc5f7bF0EF69C0c090849d497C8F8A',
        '0x030786336Bc7833D4325404A25FE451e4fde9807',
        '0xd2cE52833a2a70Cf6255c6374Bc44525a0FB93D8',
      ],
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'profits',
    blockNumber: 186041228,

    input: {
      timePeriod: TimePeriod.oneDay,
      userAddress: '0xe6617823d8008dfccba01187c24d17ad35c432db',
      includeRawValues: true,
      filterProtocolTokens: ['0xCE5F24B7A95e9cBa7df4B54E911B4A3Dc8CDAf6f'],
    },
  },
  {
    chainId: Chain.Ethereum,
    key: 'position2',
    method: 'positions',
    blockNumber: 18571794,
    input: {
      userAddress: '0x492d896d2244026a60cf3c46ec742d041a34c4cb',

      filterProtocolTokens: [
        '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
        '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
      ],
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    blockNumber: 19184953,
    input: {
      userAddress: '0xeb6CF828ACADADF91341C04140216Fa65f26B296',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'],
    },
  },
  {
    chainId: Chain.Ethereum,
    key: 'profits2',
    method: 'profits',
    blockNumber: 19184953,
    input: {
      userAddress: '0xeb6CF828ACADADF91341C04140216Fa65f26B296',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'],
    },
  },
]
