import { Chain } from '../../../core/constants/chains'
// import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0x38989BBA00BDF8181F4082995b3DEAe96163aC5D',
  //   },
  //   blockNumber: 19333888,
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'positions',
  //   input: {
  //     userAddress: '0x9CBF099ff424979439dFBa03F00B5961784c06ce',
  //   },
  //   key: '2',
  //   blockNumber: 19333888,
  // },

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
    blockNumber: 19333888,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
      fromBlock: 19339143 - 1,
      toBlock: 19339143 + 1,
      protocolTokenAddress:
        '0xB323495F7E4148BE5643A4EA4A8221EEF163E4BCCFDEDC2A6F4696BAACBC86CC',
      productId: 'market-supply',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0x8FB1e48d47301fe6D506192B036dD25e17Aca273',
      fromBlock: 19338914 - 1,
      toBlock: 19338914 + 1,
      protocolTokenAddress:
        '0xC54D7ACF14DE29E0E5527CABD7A576506870346A78A11A6762E2CCA66322EC41',
      productId: 'market-borrow',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x8FB1e48d47301fe6D506192B036dD25e17Aca273',
      fromBlock: 19338887 - 1,
      toBlock: 19338887 + 1,
      protocolTokenAddress:
        '0xC54D7ACF14DE29E0E5527CABD7A576506870346A78A11A6762E2CCA66322EC41',
      productId: 'market-supply',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'repays',
    input: {
      userAddress: '0x357dfdC34F93388059D2eb09996d80F233037cBa',
      fromBlock: 19338885 - 1,
      toBlock: 19338885 + 1,
      protocolTokenAddress:
        '0x698FE98247A40C5771537B5786B2F3F9D78EB487B4CE4D75533CD0E94D88A115',
      productId: 'market-borrow',
    },
  },
]
