import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xa3e8c7e7402565d4476661f37bd033bb8d960e49',

      filterProtocolTokens: [
        '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852',
        '0x3041CbD36888bECc7bbCBc0045E3B1f144466f5f',
      ],
    },
    blockNumber: 19277194,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0xafb4947ef8d4d97d361b6408cc927a57802ce697',
      filterProtocolTokens: ['0xF64Dfe17C8b87F012FCf50FbDA1D62bfA148366a'],
    },
    blockNumber: 183465700,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xBA54C070B1f44DFb5fe161e5dC3062E2b965166D',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852'],
    },
    blockNumber: 19277194,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xBA54C070B1f44DFb5fe161e5dC3062E2b965166D',
      fromBlock: 19234490,
      toBlock: 19234499,
      productId: 'pool',
      protocolTokenAddress: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x24D1da1D4b85F11EA7864fa1caac7A68a2A4e3Cc',
      fromBlock: 19229200,
      toBlock: 19229220,
      productId: 'pool',
      protocolTokenAddress: '0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852',
    },
  },
]
