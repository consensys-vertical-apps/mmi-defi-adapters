import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xdEdB5F78Dabf7541C3367080695Eb51458Cd5317',

      filterProtocolTokens: [
        '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
        '0x3Afdc9BCA9213A35503b077a6072F3D0d5AB0840',
      ],
    },

    blockNumber: 21174465,
  },
]
