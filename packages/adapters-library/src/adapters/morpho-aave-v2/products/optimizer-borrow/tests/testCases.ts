import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x4C09DD7c598b12c781C4B5d74D245a1784a2E148',

      filterProtocolTokens: [
        '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
        '0xBcca60bB61934080951369a648Fb03DF4F96263C',
        '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811',
      ],
    },
    blockNumber: 18733080,
  },
]
