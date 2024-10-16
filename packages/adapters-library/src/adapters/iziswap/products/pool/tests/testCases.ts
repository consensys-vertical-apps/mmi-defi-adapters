import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x9bb2fac54f168bce6986c3856fcb42d5c365b689',
      filterProtocolTokens: ['0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c'],
    },
    blockNumber: 1119633,
  },
  {
    chainId: Chain.Linea,
    method: 'deposits',
    input: {
      userAddress: '0x13eccc7ec8ef9c1a968136dd2d93b0ad4126aa70',
      fromBlock: 1105300,
      toBlock: 1105301,
      protocolTokenAddress: '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
      tokenId: '22264',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'withdrawals',
    input: {
      userAddress: '0xa37ea048210b9d2b4639f2d50bb2793f59f8cd92',
      fromBlock: 1105363,
      toBlock: 1105364,
      protocolTokenAddress: '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
      tokenId: '20805',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'profit1',
    method: 'profits',
    input: {
      userAddress: '0x9BB2faC54F168bcE6986C3856FCb42D5c365B689',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c'],
    },
    blockNumber: 1105311,
  },
  {
    chainId: Chain.Linea,
    key: 'profit2',
    method: 'profits',
    input: {
      userAddress: '0xb86a352cffe8629266fd0279407ecddb67e5c328',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c'],
    },
    blockNumber: 1105311,
  },
]
