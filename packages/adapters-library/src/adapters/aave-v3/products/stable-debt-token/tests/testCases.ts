import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'
import { WriteActions } from '../../../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: [
      '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
      '0x0B925eD163218f6662a35e0f0371Ac234f9E9371',
      '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    ],

    blockNumber: 19818582,
  },
]
