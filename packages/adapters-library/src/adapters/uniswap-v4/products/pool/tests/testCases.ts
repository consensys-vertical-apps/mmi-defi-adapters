import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x4Ea2BAa58ece66DD5193b2CCaD50A91a217559BC',
      filterProtocolTokens: ['0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e'], // Uniswap V4 PositionManager
      filterTokenIds: [
        '43603',
        '15813',
        '20592',
        '20321',
        '36628',
        '20944',
        '16805',
        '43607',
        '20041',
        '61769',
        '18061',
        '18156',
        '18065',
      ],
    },

    blockNumber: 23245988,
  },
]
