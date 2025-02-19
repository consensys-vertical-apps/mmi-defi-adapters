import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xa3e8c7e7402565d4476661f37bd033bb8d960e49',

      filterProtocolTokens: [
        '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852',
        '0x3041CbD36888bECc7bbCBc0045E3B1f144466f5f',
      ],
    },
    blockNumber: 19277194,
  },
]
