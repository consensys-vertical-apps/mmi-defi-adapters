import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781',

      filterProtocolTokens: [
        '0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656',
        '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
        '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec',
        '0x9c39809Dec7F95F5e0713634a4D0701329B3b4d2',
        '0x6C3c78838c761c6Ac7bE9F59fe808ea2A6E4379d',
        '0x619beb58998eD2278e08620f97007e1116D5D25b',
      ],
    },
    blockNumber: 18183880,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781',
      timePeriod: TimePeriod.oneDay,

      filterProtocolTokens: [
        '0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656',
        '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e',
        '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec',
        '0x9c39809Dec7F95F5e0713634a4D0701329B3b4d2',
        '0x6C3c78838c761c6Ac7bE9F59fe808ea2A6E4379d',
        '0x619beb58998eD2278e08620f97007e1116D5D25b',
      ],
    },
    blockNumber: 19262682 + 1,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18183880,
  },

  {
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0x47ab2ba28c381011fa1f25417c4c2b2c0d5b4781',
      fromBlock: 19262682 - 1,
      toBlock: 19262682 + 1,
      protocolTokenAddress: '0x531842cEbbdD378f8ee36D171d6cC9C4fcf475Ec',
      productId: 'variable-debt-token',
    },
  },
]
