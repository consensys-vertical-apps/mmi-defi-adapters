import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'farm-v1',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x432e73a263aa7a4b909ad8afecdda0479305e187',

      filterProtocolTokens: [
        '0x38EA452219524Bb87e18dE1C24D3bB59510BD783',
        '0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E',
        '0x38EA452219524Bb87e18dE1C24D3bB59510BD783',
      ],
    },

    blockNumber: 20634750,
  },
]
