import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

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
]
