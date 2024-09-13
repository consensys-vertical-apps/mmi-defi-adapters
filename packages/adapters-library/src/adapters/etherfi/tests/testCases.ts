import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x61Be170a52A61b318ACcF8Fc77153454B4bd5c78',

      filterProtocolTokens: [
        '0x35fA164735182de50811E8e2E824cFb9B6118ac2',
        '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
      ],
    },

    blockNumber: 20740530,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x61Be170a52A61b318ACcF8Fc77153454B4bd5c78',
      timePeriod: TimePeriod.sevenDays,

      filterProtocolTokens: [
        '0x35fA164735182de50811E8e2E824cFb9B6118ac2',
        '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
      ],
    },

    blockNumber: 20740544,
  },
]
