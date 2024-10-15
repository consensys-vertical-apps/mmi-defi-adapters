import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'pool-v1-and-stake',
    input: {
      userAddress: '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',

      filterProtocolTokens: [
        '0xdf0770dF86a8034b3EFEf0A1Bb3c889B8332FF56',
        '0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E',
      ],
    },
    blockNumber: 18163124,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0xdf0770dF86a8034b3EFEf0A1Bb3c889B8332FF56'],
    blockNumber: 19661888,
  },
]
