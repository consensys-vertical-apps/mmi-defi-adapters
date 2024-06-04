import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Base,
    method: 'positions',

    input: {
      userAddress: '0x50fa50fa2032d85eb2dda303929bf56886aa9afb',

      filterProtocolTokens: [
        '0xb63682961B3dC55d2aD8AD756beAEcDDe8474E83',
        '0x4Fc0E7cDfe0CF92762eaf3CEE9133239A2197391',
        '0x92868C059CfCd035ea204e3163Bd84b308dD358e',
      ],
    },

    blockNumber: 15374682,
  }
]
