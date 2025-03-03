import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

const User1 = '0x61Be170a52A61b318ACcF8Fc77153454B4bd5c78' // Has eETH and weETH

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
]
