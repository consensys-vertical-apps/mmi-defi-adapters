import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
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
    method: 'withdrawals',
    key: '3',
    input: {
      userAddress: '0x8851924938db253C2602cFB473C33b88dEb83C43',
      fromBlock: 18632773 - 1,
      toBlock: 18632773 + 1,
      protocolTokenAddress: '0xaa0c3f5f7dfd688c6e646f66cd2a6b66acdbe434',
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
]
