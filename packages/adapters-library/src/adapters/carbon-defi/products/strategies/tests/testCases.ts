import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions1',
    input: {
      userAddress: '0x83524B9EFF5d76Ee4Dba5Bb78B8B2e8BaD3a00Be',
      filterProtocolTokens: ['0x3660F04B79751e31128f6378eAC70807e38f554E'],
    },
    blockNumber: 19184953,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions2',
    input: {
      userAddress: '0xb58796c7e02852D46bE2d82c7aCCd4524a43b9dE',

      filterProtocolTokens: [
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
      ],
    },
    blockNumber: 19184953,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions3',
    input: {
      userAddress: '0xE227836Af161c8194D982a658BEF21F2fD594BDA',

      filterProtocolTokens: [
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
      ],
    },
    blockNumber: 19184953,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    key: 'deposits1',
    input: {
      userAddress: '0x83524B9EFF5d76Ee4Dba5Bb78B8B2e8BaD3a00Be',
      fromBlock: 17580507,
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
      userAddress: '0xAD7041ccf5Ec82d441B6f2EDf0CC958a58bFdCFc',
      fromBlock: 18270000,
      toBlock: 18927675,
      protocolTokenAddress: '0x3660F04B79751e31128f6378eAC70807e38f554E',
      productId: 'strategies',
      tokenId: '76563532557211154279259286672147847578263',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: 'withdrawals2',
    input: {
      userAddress: '0x20BFFFdB086D35e1eE06b1e0Beb849eE0a0E945c',
      fromBlock: 18270000,
      toBlock: 18656079,
      protocolTokenAddress: '0x3660F04B79751e31128f6378eAC70807e38f554E',
      productId: 'strategies',
      tokenId: '1701411834604692317316873037158841057528',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: 'profits1',
    input: {
      userAddress: '0xE227836Af161c8194D982a658BEF21F2fD594BDA',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: [
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
      ],
    },
    blockNumber: 19184953,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: 'profits2',
    input: {
      userAddress: '0xE227836Af161c8194D982a658BEF21F2fD594BDA',
      timePeriod: TimePeriod.sevenDays,

      filterProtocolTokens: [
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
        '0x3660F04B79751e31128f6378eAC70807e38f554E',
      ],
    },
    blockNumber: 19184953,
  },
]
