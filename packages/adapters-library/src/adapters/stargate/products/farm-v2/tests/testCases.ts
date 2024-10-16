import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'farm-v2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x730964F8850708D16f6E455346EB7BC8042c737B',
      filterProtocolTokens: ['0x17BBC9BD51A52aAf4d2CC6652630DaF4fdB358F7'],
    },

    blockNumber: 20641851,
  },
  {
    key: 'farm-v2',
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x1EF1258341086d4a9566f797Da15FcfDc92bb3B8',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0xfcb42A0e352a08AbD50b8EE68d01f581B6Dfd80A'],
    },

    blockNumber: 20662804,
  },
  {
    key: 'farm-v2',
    chainId: Chain.Ethereum,
    method: 'withdrawals',

    input: {
      userAddress: '0x1EF1258341086d4a9566f797Da15FcfDc92bb3B8',
      protocolTokenAddress: '0xfcb42a0e352a08abd50b8ee68d01f581b6dfd80a',
      fromBlock: 20661895,
      toBlock: 20661895,
    },
  },
]
