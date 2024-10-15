import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'pt-sy',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x15742F8Aea5b6E5c79A98420F8a18E77717a4bbc',

      filterProtocolTokens: [
        '0xED97f94dd94255637A054098604E0201C442a3FD',
        '0x256Fb830945141f7927785c06b65dAbc3744213c',
        '0x391B570e81e354a85a496952b66ADc831715f54f',
        '0x4AfdB1B0f9A56922e398D29239453e6A06148eD0',
        '0xf99985822fb361117FCf3768D34a6353E6022F5F',
        '0xcbC72d92b2dc8187414F6734718563898740C0BC',
        '0x253008ba4aE2f3E6488DC998a5321D4EB1a0c905',
        '0xD7DF7E085214743530afF339aFC420c7c720BFa7',
        '0x7786729eEe8b9d30fE7d91fDFf23A0f1D0C615D9',
      ],
    },

    blockNumber: 20572021,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
      filterProtocolTokens: ['0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966'],
    },
    blockNumber: 20126536,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',

    input: {
      userAddress: '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
      fromBlock: 20089673,
      toBlock: 20089673,
      protocolTokenAddress: '0xc69Ad9baB1dEE23F4605a82b3354F8E40d1E5966',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    key: 'pt',
    filterProtocolToken: '0xF0574d8B9Dc3a9DE768eaa7DBB7bB0C68521b148',
    blockNumber: 20572049,
  },
]
