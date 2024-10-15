import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'susde',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x3F843189280A4379EB12B928afD5D96Df8076679',
      filterProtocolTokens: ['0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'],
    },
    blockNumber: 19774108,
  },
  {
    key: 'sena',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x005fb56fe0401a4017e6f046272da922bbf8df06',
      filterProtocolTokens: ['0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9'],
    },

    blockNumber: 20942611,
  },
  {
    key: 'lp-staking',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x577c6a57c435b53c7d5c6878c7736b9781c778a3',

      filterProtocolTokens: [
        '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
        '0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9',
      ],
    },

    blockNumber: 20942612,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0xf197887FC6E6cC788eb18F0Bc226E10F07b4ECC7',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x9D39A5DE30e57443BfF2A8307A4256c8797A3497'],
    },

    blockNumber: 19632370,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',

    blockNumber: 19776342,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',

    filterProtocolTokens: [
      '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
      '0x8bE3460A480c80728a8C4D7a5D5303c85ba7B3b9',
      '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
      '0x57e114B691Db790C35207b2e685D4A43181e6061',
    ],

    blockNumber: 20942622,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x3636BC1Bb4f61b04AA73D974F068AF0d0743Fa01',
      fromBlock: 19776211,
      toBlock: 19776211,
      protocolTokenAddress: '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
    },
  },
]
