import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',

      filterProtocolTokens: [
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      ],

      filterTokenIds: ['567587', '573046'],
    },
    blockNumber: 18326120,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '2',
    input: {
      userAddress: '0x69D727a5F4731271C36DC600AE9fa3E6F3Ae29B6',

      filterProtocolTokens: [
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      ],

      filterTokenIds: ['587543', '587789'],
    },
    blockNumber: 18412988,
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
    key: 'profit1',
    method: 'profits',
    input: {
      userAddress: '0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0xC36442b4a4522E871399CD717aBDD847Ab11FE88'],
      filterTokenIds: ['567587'],
    },
    blockNumber: 18241163,
  },
  {
    chainId: Chain.Ethereum,
    key: 'profit2',
    method: 'profits',
    input: {
      userAddress: '0x69D727a5F4731271C36DC600AE9fa3E6F3Ae29B6',
      timePeriod: TimePeriod.sevenDays,

      filterProtocolTokens: [
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
      ],

      filterTokenIds: ['587543', '587789'],
    },
    blockNumber: 18412988,
  },
  {
    chainId: Chain.Ethereum,
    key: 'profit3',
    method: 'profits',
    input: {
      userAddress: '0xedddb9438f0e5c1e346a5a892ca0ae4f3a863e4a',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0xC36442b4a4522E871399CD717aBDD847Ab11FE88'],
      filterTokenIds: ['619727'],
    },
    blockNumber: 18734865,
  },
]
