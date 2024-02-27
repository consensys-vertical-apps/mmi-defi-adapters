import { Chain } from '../../../core/constants/chains'
// import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x38989bba00bdf8181f4082995b3deae96163ac5d',
    },
    blockNumber: 19312585,
  },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0x7dc1fbf0e894162eca4d0b28fc0dca1437d31ce4',
  //     timePeriod: TimePeriod.oneDay,
  //     includeRawValues: true,
  //   },
  //   blockNumber: 19220228 + 1,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   key: '2',
  //   input: {
  //     userAddress: '0xd0B8DfCF9dA999db981A60a8DA6584E8e52b757c',
  //     timePeriod: TimePeriod.oneDay,
  //     includeRawValues: true,
  //   },
  //   blockNumber: 19259859 + 1,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   key: '3',
  //   input: {
  //     userAddress: '0x306c9b45050F1FF0a4470f9801CCBCe97a2aC5A2',
  //     timePeriod: TimePeriod.oneDay,
  //     includeRawValues: true,
  //   },
  //   blockNumber: 19223914 + 1,
  // },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 19312585,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apr',
    blockNumber: 19312585,
  },
  {
    chainId: Chain.Ethereum,
    method: 'apy',
    blockNumber: 19312585,
  },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'withdrawals',
  //   input: {
  //     userAddress: '0x306c9b45050F1FF0a4470f9801CCBCe97a2aC5A2',
  //     fromBlock: 19312585 - 1,
  //     toBlock: 19312585 + 1,
  //     protocolTokenAddress: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
  //     productId: 'optimizer-supply',
  //   },
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'deposits',
  //   input: {
  //     userAddress: '0x7F429edeff8afC7Bb3A2CF7DB832Fc86f6FA99DA',
  //     fromBlock: 19312585 - 1,
  //     toBlock: 19312585 + 1,
  //     protocolTokenAddress: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
  //     productId: 'optimizer-supply',
  //   },
  // },
]
