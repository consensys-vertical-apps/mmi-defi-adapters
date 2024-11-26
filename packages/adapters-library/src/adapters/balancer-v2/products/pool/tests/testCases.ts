import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x9b2e3525a6e707ED2825E39ECe9ba46a7dbd7A43',
      filterProtocolTokens: ['0xF94A7Df264A2ec8bCEef2cFE54d7cA3f6C6DFC7a'],
    },

    blockNumber: 21242515,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '2',

    input: {
      userAddress: '0xF23c8539069C471F5C12692a3471C9F4E8B88BC2',
      filterProtocolTokens: ['0x3de27EFa2F1AA663Ae5D458857e731c129069F29'],
    },

    blockNumber: 21242486,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '3',

    input: {
      userAddress: '0xDB2a2f53e2bC952Abde8Aa1cC32F09dFF35F7C42',
      filterProtocolTokens: ['0x848a5564158d84b8A8fb68ab5D004Fae11619A54'],
    },

    blockNumber: 21270797,
  },
]
