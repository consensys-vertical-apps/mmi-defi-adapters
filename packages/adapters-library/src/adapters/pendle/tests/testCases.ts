import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
      filterProtocolTokens: ['0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966'],
    },

    blockNumber: 20126536,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
      filterProtocolTokens: ['0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966'],
    },
    blockNumber: 20126536,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '4 positions',
    input: {
      userAddress: '0xb289360a2ab9eacffd1d7883183a6d9576db515f',

      filterProtocolTokens: [
        '0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966',
        '0xeEE8aED1957ca1545a0508AfB51b53cCA7e3c0d1',
        '0xDDFD5e912C1949B4bDb12579002c44B7A83F9E88',
        '0x98601E27d41ccff643da9d981dc708cf9eF1F150',
      ],
    },

    blockNumber: 20126536,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',

    input: {
      userAddress: '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
      fromBlock: 20089673,
      toBlock: 20089673,
      protocolTokenAddress: '0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966',
      productId: 'principle-token',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    key: '1',
    filterProtocolToken: '0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966',
    blockNumber: 20126536,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    key: '2',
    filterProtocolToken: '0xeEE8aED1957ca1545a0508AfB51b53cCA7e3c0d1',
    blockNumber: 20126536,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    key: '3',
    filterProtocolToken: '0xDDFD5e912C1949B4bDb12579002c44B7A83F9E88',
    blockNumber: 20126536,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    key: '4',
    filterProtocolToken: '0x98601E27d41ccff643da9d981dc708cf9eF1F150',
    blockNumber: 20126536,
  },
]
