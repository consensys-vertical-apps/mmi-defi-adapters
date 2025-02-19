import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0x81040dae0d9db2cad734da39bf4a14e46d77feb3',
      filterProtocolTokens: ['0xd849c2b7991060023e5d92b92c68f4077ae2c2ba'],

      filterTokenIds: [
        '452312848583266388373385778560718648249770263156390604487522901302855073939',
      ],
    },
    blockNumber: 225214200,
  },
]
