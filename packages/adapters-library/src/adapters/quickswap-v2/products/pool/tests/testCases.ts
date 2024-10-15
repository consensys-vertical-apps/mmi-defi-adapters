import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Polygon,
    method: 'positions',

    input: {
      userAddress: '0x51b93f0ca523faf0afE6F7049Cfd4aFdc513BcE5',
      filterProtocolTokens: ['0xdC9232E2Df177d7a12FdFf6EcBAb114E2231198D'],
    },

    blockNumber: 54212235,
  },
  {
    chainId: Chain.Polygon,
    method: 'profits',

    input: {
      userAddress: '0xa4169504D316e56D492068e99d7709eF3951456B',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0xadbF1854e5883eB8aa7BAf50705338739e558E5b'],
    },

    blockNumber: 54212235,
  },
  {
    chainId: Chain.Polygon,
    method: 'withdrawals',

    input: {
      userAddress: '0xC8f14E1e9A612183Ebf77E517cf5B340149f3255',
      fromBlock: 54168036,
      toBlock: 54168036,
      protocolTokenAddress: '0xadbF1854e5883eB8aa7BAf50705338739e558E5b',
    },
  },
  {
    chainId: Chain.Polygon,
    method: 'deposits',

    input: {
      userAddress: '0xa4169504D316e56D492068e99d7709eF3951456B',
      fromBlock: 54158161,
      toBlock: 54158161,
      protocolTokenAddress: '0xadbF1854e5883eB8aa7BAf50705338739e558E5b',
    },
  },
]
