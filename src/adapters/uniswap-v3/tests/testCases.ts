import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
    },
    blockNumber: 18326120,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
      fromBlock: 18262163,
      toBlock: 18262164,
      protocolTokenAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      productId: 'pool',
      tokenId: '573046',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x1d201a9B9f136dE7e7fF4A80a27e96Af7789D9BE',
      fromBlock: 18274545,
      toBlock: 18274547,
      protocolTokenAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      productId: 'pool',
      tokenId: '573517',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
      timePeriod: TimePeriod.sevenDays,
    },
    blockNumber: 18241163,
  },
]
