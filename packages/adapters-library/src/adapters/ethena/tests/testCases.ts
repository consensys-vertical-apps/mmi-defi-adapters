import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x3F843189280A4379EB12B928afD5D96Df8076679',
      filterProtocolTokens: ['0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'],
    },

    blockNumber: 19774108,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0xf197887FC6E6cC788eb18F0Bc226E10F07b4ECC7',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'],
    },

    blockNumber: 19632370,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',

    blockNumber: 19776342,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'],
    blockNumber: 19776342,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x3636BC1Bb4f61b04AA73D974F068AF0d0743Fa01',
      fromBlock: 19776211,
      toBlock: 19776211,
      protocolTokenAddress: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      productId: 'ethena',
    },
  },
]
