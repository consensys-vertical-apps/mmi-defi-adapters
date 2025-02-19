import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    key: 'tvl',
    filterProtocolTokens: ['0x63B1129ca97D2b9F97f45670787Ac12a9dF1110a'],
    blockNumber: 21020002,
  },
]
