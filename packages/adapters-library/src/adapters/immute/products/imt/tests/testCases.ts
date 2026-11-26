import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xaCA73EA0583D870eeea1373DCf0003CA3d52CAbB',
      filterProtocolTokens: ['0xDCfDC48c941561d7ec5E819834e6D99A0c838Dd3'],
    },

    blockNumber: 26500925,
  },
  {
    key: 'imt',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xDCfDC48c941561d7ec5E819834e6D99A0c838Dd3',
    blockNumber: 26500925,
  },
]
