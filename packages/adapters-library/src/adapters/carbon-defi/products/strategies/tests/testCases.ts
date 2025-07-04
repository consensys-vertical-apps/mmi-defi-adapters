import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'positions1',
    input: {
      userAddress: '0x83524B9EFF5d76Ee4Dba5Bb78B8B2e8BaD3a00Be',
      filterProtocolTokens: ['0x3660F04B79751e31128f6378eAC70807e38f554E'],
      openingPositionTxHash:
        '0x8469742831a9fbf3cd9576cd40ea2444fffea64af6fb44259f2ecae41c167bf9',
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
]
