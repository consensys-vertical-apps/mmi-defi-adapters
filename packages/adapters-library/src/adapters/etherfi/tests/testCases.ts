import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

const User1 = '0x61Be170a52A61b318ACcF8Fc77153454B4bd5c78' // Has eETH and weETH
const User2 = '0xd3363fA4E7EDdA471527d960D65EFBc6351cC094' // Has weETHk

export const testCases: TestCase[] = [
  {
    key: 'user1',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: User1,

      filterProtocolTokens: [
        '0x35fA164735182de50811E8e2E824cFb9B6118ac2',
        '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
      ],
    },

    blockNumber: 20740530,
  },
  {
    key: 'user1',
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: User1,
      timePeriod: TimePeriod.sevenDays,

      filterProtocolTokens: [
        '0x35fA164735182de50811E8e2E824cFb9B6118ac2',
        '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
      ],
    },

    blockNumber: 20740544,
  },
  {
    key: 'user2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: User2,

      filterProtocolTokens: ['0x7223442cad8e9cA474fC40109ab981608F8c4273'],
    },

    blockNumber: 20751518,
  },
  {
    key: 'user2',
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: User2,
      timePeriod: TimePeriod.thirtyDays,

      filterProtocolTokens: ['0x7223442cad8e9cA474fC40109ab981608F8c4273'],
    },

    blockNumber: 20751570,
  },
]
