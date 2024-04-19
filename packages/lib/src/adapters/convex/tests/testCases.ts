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

      filterProtocolTokens: [
        '0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C',
        '0x689440f2Ff927E1f24c72F1087E1FAF471eCe1c8',
      ],
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '2',
    blockNumber: 18634843, // 14447312 + 1, // next block after deposit transaction
    input: {
      userAddress: '0x0034daf2e65F6ef82Bc6F893dbBfd7c232a0e59C',

      filterProtocolTokens: [
        '0x0A760466E1B4621579a82a39CB56Dda2F4E70f03',
        '0xA84f2187371e8A61fa6634eCB3Ff6D89dF299e0e',
        '0x39D78f11b246ea4A1f68573c3A5B64E83Cff2cAe',
        '0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434',
      ],
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: '3',
    blockNumber: 18634843, // 14447312 + 1, // next block after deposit transaction
    input: {
      userAddress: '0x8654a995426e775f3ef023cd6e1b5681e774ffa1',

      filterProtocolTokens: [
        '0xf34DFF761145FF0B05e917811d488B441F33a968',
        '0x44D8FaB7CD8b7877D5F79974c2F501aF6E65AbBA',
        '0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434',
      ],
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
      productId: 'staking',
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
      productId: 'staking',
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

      filterProtocolTokens: [
        '0xf34DFF761145FF0B05e917811d488B441F33a968',
        '0x44D8FaB7CD8b7877D5F79974c2F501aF6E65AbBA',
        '0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434',
      ],
    },
    blockNumber: 18713643,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: 'cvxcrv-wrapper',
    input: {
      userAddress: '0x8654a995426e775f3ef023cd6e1b5681e774ffa1',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434'],
      includeRawValues: true,
    },
    blockNumber: 18713643,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    blockNumber: 187764987,
    input: {
      userAddress: '0x4bad2833c44424423518194f07c4917be28d7363',
      filterProtocolTokens: ['0x90927a78ad13C0Ec9ACf546cE0C16248A7E7a86D'],
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'withdrawals',
    key: '1',
    input: {
      userAddress: '0xcf6a6dac79e0da7a41657b961dbce14da2c958f2',
      fromBlock: 151540726 - 1,
      toBlock: 151540726 + 1,
      protocolTokenAddress: '0x90927a78ad13c0ec9acf546ce0c16248a7e7a86d',
      productId: 'sidechain-staking',
    },
  },
]
