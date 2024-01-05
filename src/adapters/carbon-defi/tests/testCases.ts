import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions1',
    input: {
      userAddress: '0x83524B9EFF5d76Ee4Dba5Bb78B8B2e8BaD3a00Be',
    },
    blockNumber: 18942987,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions2',
    input: {
      userAddress: '0xb58796c7e02852D46bE2d82c7aCCd4524a43b9dE',
    },
    blockNumber: 18412988,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions3',
    input: {
      userAddress: '0xE227836Af161c8194D982a658BEF21F2fD594BDA',
    },
    blockNumber: 18412988,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    key: 'deposits1',
    input: {
      userAddress: '0x83524B9EFF5d76Ee4Dba5Bb78B8B2e8BaD3a00Be',
      fromBlock: 14776536,
      toBlock: 18262164,
      protocolTokenAddress: '0x3660F04B79751e31128f6378eAC70807e38f554E',
      productId: 'strategies',
      tokenId: '340282366920938463463374607431768211693',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: 'withdrawals1',
    input: {
      userAddress: '0xE227836Af161c8194D982a658BEF21F2fD594BDA',
      fromBlock: 18270000,
      toBlock: 18274547,
      protocolTokenAddress: '0x3660F04B79751e31128f6378eAC70807e38f554E',
      productId: 'strategies',
      tokenId: '1701411834604692317316873037158841057386',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: 'profits1',
    input: {
      userAddress: '0xE227836Af161c8194D982a658BEF21F2fD594BDA',
      timePeriod: TimePeriod.oneDay,
    },
    blockNumber: 18412988,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: 'profits2',
    input: {
      userAddress: '0xE227836Af161c8194D982a658BEF21F2fD594BDA',
      timePeriod: TimePeriod.sevenDays,
    },
    blockNumber: 18412988,
  },
]
