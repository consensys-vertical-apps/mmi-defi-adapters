import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    blockNumber: 18634843, // 14447312 + 1, // next block after deposit transaction
    input: {
      userAddress: '0x0034daf2e65F6ef82Bc6F893dbBfd7c232a0e59C',

      filterProtocolTokens: ['0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434'],
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
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
      filterProtocolTokens: ['0xaa0C3f5F7DFD688C6E646F66CD2a6B66ACdbE434'],
      includeRawValues: true,
    },
    blockNumber: 18713643,
  },
]
