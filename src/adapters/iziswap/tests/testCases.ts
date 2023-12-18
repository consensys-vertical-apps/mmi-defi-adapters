import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Bsc,
    method: 'positions',
    input: {
      userAddress: '0x2E13580a21Fd7fEd9BAB89761A637dd63245a4D5',
    },
    blockNumber: 34467153,
  },
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x9bb2fac54f168bce6986c3856fcb42d5c365b689',
    },
    blockNumber: 1119633,
  },
  {
    chainId: Chain.Bsc,
    method: 'deposits',
    input: {
      userAddress: '0x581e52c4a9d837b9DDCE5a2dcCcD2E6CD938d397',
      fromBlock: 34118504,
      toBlock: 34118506,
      protocolTokenAddress: '0xBF55ef05412f1528DbD96ED9E7181f87d8C9F453',
      productId: 'iziswap',
      tokenId: '84',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'deposits',
    input: {
      userAddress: '0x13eccc7ec8ef9c1a968136dd2d93b0ad4126aa70',
      fromBlock: 1105300,
      toBlock: 1105301,
      protocolTokenAddress: '0x1CB60033F61e4fc171c963f0d2d3F63Ece24319c',
      productId: 'iziswap',
      tokenId: '22264',
    },
  },
  {
    chainId: Chain.Bsc,
    method: 'withdrawals',
    input: {
      userAddress: '0x4F21a0Af178d9EB793c2D94d9d88910e974a98fD',
      fromBlock: 34127856,
      toBlock: 34127858,
      protocolTokenAddress: '0xBF55ef05412f1528DbD96ED9E7181f87d8C9F453',
      productId: 'iziswap',
      tokenId: '85',
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
      productId: 'iziswap',
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
    },
    blockNumber: 1105311,
  },
]
