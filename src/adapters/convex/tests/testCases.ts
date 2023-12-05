import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    blockNumber: 18634843, // 14447312 + 1, // next block after deposit transaction
    input: {
      userAddress: '0xdf286De6d3de10A6aD6452d0BA94Af7AD7B68F9B',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '2',
    blockNumber: 18634843, // 14447312 + 1, // next block after deposit transaction
    input: {
      userAddress: '0x0034daf2e65F6ef82Bc6F893dbBfd7c232a0e59C',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '3',
    blockNumber: 18634843, // 14447312 + 1, // next block after deposit transaction
    input: {
      userAddress: '0x8654a995426e775f3ef023cd6e1b5681e774ffa1',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xdf286De6d3de10A6aD6452d0BA94Af7AD7B68F9B',
      fromBlock: 14443070 - 1,
      toBlock: 14443070 + 1,
      protocolTokenAddress: '0x30d9410ed1d5da1f6c8391af5338c93ab8d4035c',
      productId: 'pool',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: '1',
    input: {
      userAddress: '0x8654A995426E775f3ef023cD6e1B5681e774FFa1',
      fromBlock: 18596961 - 1,
      toBlock: 18596961 + 1,
      protocolTokenAddress: '0xf34dff761145ff0b05e917811d488b441f33a968',
      productId: 'rewards',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: '2',
    input: {
      userAddress: '0xc692d583567cdA0fDE14Cd3D6136c2623202Ed68',
      fromBlock: 18157201 - 1,
      toBlock: 18157201 + 1,
      protocolTokenAddress: '0x22ee18aca7f3ee920d01f25da85840d12d98e8ca',
      productId: 'extra-reward',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: '3',
    input: {
      userAddress: '0x8851924938db253C2602cFB473C33b88dEb83C43',
      fromBlock: 18632773 - 1,
      toBlock: 18632773 + 1,
      protocolTokenAddress: '0xaa0c3f5f7dfd688c6e646f66cd2a6b66acdbe434',
      productId: 'cvxcrv-wrapper',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x8654a995426e775f3ef023cd6e1b5681e774ffa1',
      timePeriod: TimePeriod.oneDay,
    },
  },
]
