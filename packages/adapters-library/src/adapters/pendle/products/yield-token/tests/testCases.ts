import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    key: 'yt-lp',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0xf26898ad64a3f05df5b9b5f7868703a0ab272205',

      filterProtocolTokens: [
        '0x4AfdB1B0f9A56922e398D29239453e6A06148eD0',
        '0x1a65eB80a2ac3ea6E41D456DdD6E9cC5728BEf7C',
        '0xD66b560f4e3e85f22C192d91dA847886d5C5Fd00',
        '0x730A5E2AcEbccAA5e9095723B3CB862739DA793c',
        '0x253008ba4aE2f3E6488DC998a5321D4EB1a0c905',
        '0x7786729eEe8b9d30fE7d91fDFf23A0f1D0C615D9',
        '0xA54FC268101c8b97DE19eF3141d34751a11996B2',
        '0x038C1b03daB3B891AfbCa4371ec807eDAa3e6eB6',
      ],
    },

    blockNumber: 20572021,
  },
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
    method: 'prices',
    key: 'yt',
    filterProtocolToken: '0xD66b560f4e3e85f22C192d91dA847886d5C5Fd00',
    blockNumber: 20572049,
  },
]
