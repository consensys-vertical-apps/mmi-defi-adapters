import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

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
    chainId: Chain.Ethereum,
    method: 'prices',
    key: 'lp-price',
    filterProtocolToken: '0xf8208fb52ba80075af09840a683143c22dc5b4dd',
    blockNumber: 21057297,
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'lp-pump-bts',
    input: {
      userAddress: '0x117C99451cae094B3a7d56C9d3A97c96900b8e7A',
      filterProtocolTokens: ['0xf8208fB52BA80075aF09840A683143C22DC5B4dd'],
    },
    blockNumber: 21057127,
  },
]
