import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'],
    blockNumber: 20111277,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x46896eB79d926712E1134fad5ACBaAF53c1cbE74',
      filterProtocolTokens: ['0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'],
    },

    blockNumber: 20111277,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x46896eB79d926712E1134fad5ACBaAF53c1cbE74',
      filterProtocolTokens: ['0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'],
    },

    blockNumber: 20118663,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',

    input: {
      userAddress: '0x755AEBfBAd32586cFefb0fC9619C6eD4a321cd15',
      fromBlock: 20117400,
      toBlock: 20117500,
      protocolTokenAddress: '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110',
      productId: 'ez-eth',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',

    input: {
      userAddress: '0x889CEF5559EB8b6a1dBCC445fB479e5530c37D8f',
      fromBlock: 20118200,
      toBlock: 20118300,
      protocolTokenAddress: '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110',
      productId: 'ez-eth',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110',
    blockNumber: 20118664,
  },
]
