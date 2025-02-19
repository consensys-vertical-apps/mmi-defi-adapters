import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'wusdm',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x57F5E098CaD7A3D1Eed53991D4d66C45C9AF7812',
    blockNumber: 20686564,
  },
]
