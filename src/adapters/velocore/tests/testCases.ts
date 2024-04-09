import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    key: 'positions-1',
    method: 'positions',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      filterProtocolTokens: ['0xe2c67A9B15e9E7FF8A9Cb0dFb8feE5609923E5DB'],
    },
    blockNumber: 3508362,
  },
  {
    chainId: Chain.Linea,
    key: 'positions-2',
    method: 'positions',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      filterProtocolTokens: ['0x1D312eedd57E8d43bcb6369E4b8f02d3C18AAf13'],
      filterTokenIds: ['2'],
    },
    blockNumber: 3508362,
  },
  {
    chainId: Chain.Linea,
    key: 'deposits-1',
    method: 'deposits',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      fromBlock: 3500362,
      toBlock: 3508362,
      protocolTokenAddress: '0xe2c67A9B15e9E7FF8A9Cb0dFb8feE5609923E5DB',
      productId: 'pool',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'deposits-2',
    method: 'deposits',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      fromBlock: 3500362,
      toBlock: 3508362,
      protocolTokenAddress: '0x1D312eedd57E8d43bcb6369E4b8f02d3C18AAf13',
      productId: 'pool',
      tokenId: '2',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'withdrawals-1',
    method: 'withdrawals',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      fromBlock: 3500362,
      toBlock: 3508362,
      protocolTokenAddress: '0xe2c67A9B15e9E7FF8A9Cb0dFb8feE5609923E5DB',
      productId: 'pool',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'withdrawals-2',
    method: 'withdrawals',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      fromBlock: 3530362,
      toBlock: 3530947,
      protocolTokenAddress: '0x1D312eedd57E8d43bcb6369E4b8f02d3C18AAf13',
      productId: 'pool',
      tokenId: '2',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'profits-1',
    method: 'profits',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0xe2c67A9B15e9E7FF8A9Cb0dFb8feE5609923E5DB'],
    },
    blockNumber: 3508362,
  },
  {
    chainId: Chain.Linea,
    key: 'profits-2',
    method: 'profits',
    input: {
      userAddress: '0x12345206bb098B4E4B899732A6221d39e8721Fb9',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0x1D312eedd57E8d43bcb6369E4b8f02d3C18AAf13'],
      filterTokenIds: ['2'],
    },
    blockNumber: 3508362,
  },
  {
    chainId: Chain.Linea,
    key: 'prices-1',
    method: 'prices',
    filterProtocolToken: '0xe2c67A9B15e9E7FF8A9Cb0dFb8feE5609923E5DB',
    blockNumber: 3508362,
  },
  {
    chainId: Chain.Linea,
    key: 'prices-2',
    method: 'prices',
    filterProtocolToken: '0x1D312eedd57E8d43bcb6369E4b8f02d3C18AAf13',
    filterTokenId: '2',
    blockNumber: 3508362,
  },
  {
    chainId: Chain.Linea,
    key: 'prices-3',
    method: 'prices',
    blockNumber: 3508362,
  },
  {
    chainId: Chain.Linea,
    method: 'tvl',
    blockNumber: 3508362,
  },
]
