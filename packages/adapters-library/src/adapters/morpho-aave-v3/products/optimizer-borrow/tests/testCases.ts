import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xb5b29320d2Dde5BA5BAFA1EbcD270052070483ec',

      filterProtocolTokens: [
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
        '0x0B925eD163218f6662a35e0f0371Ac234f9E9371',
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
      ],
    },
    blockNumber: 18761230,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: '2',
    input: {
      userAddress: '0xd0B8DfCF9dA999db981A60a8DA6584E8e52b757c',
      timePeriod: TimePeriod.oneDay,
      includeRawValues: true,

      filterProtocolTokens: [
        '0x0B925eD163218f6662a35e0f0371Ac234f9E9371',
        '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
      ],
    },
    blockNumber: 19259859 + 1,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    key: 'tvl',
    filterProtocolTokens: ['0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c'],
    blockNumber: 19661885,
  },

  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x306c9b45050F1FF0a4470f9801CCBCe97a2aC5A2',
      fromBlock: 19223914 - 1,
      toBlock: 19223914 + 1,
      protocolTokenAddress: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x7F429edeff8afC7Bb3A2CF7DB832Fc86f6FA99DA',
      fromBlock: 19025683 - 1,
      toBlock: 19025683 + 1,
      protocolTokenAddress: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
    },
  },
]
