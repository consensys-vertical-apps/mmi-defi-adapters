import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',

    input: {
      userAddress: '0x8914fc85e44befedbd7a1f22e2469a8739b05c8a',

      filterProtocolTokens: [
        '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
        '0xf42Ae1D54fd613C9bb14810b0588FaAa09a426cA',
      ],
    },

    blockNumber: 271425317,
  },
]
