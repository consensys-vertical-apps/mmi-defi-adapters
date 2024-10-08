import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xFe459828c90c0BA4bC8b42F5C5D44F316700B430',
    blockNumber: 19311615,
  },
]
