import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    key: 'pool-v2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x006fbb8a8aeb9982b54ec213a675a19b121b3423',
      filterProtocolTokens: ['0xfcb42A0e352a08AbD50b8EE68d01f581B6Dfd80A'],
    },

    blockNumber: 20636813,
  },
  {
    key: 'pool-v2',
    chainId: Chain.Base,
    method: 'positions',

    input: {
      userAddress: '0x006fbb8a8aeb9982b54ec213a675a19b121b3423',
      filterProtocolTokens: ['0x98fB8522d891F43B771e2d27367b41Ba138D0B80'],
    },

    blockNumber: 19088200,
  },
]
