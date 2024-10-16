import { Chain } from '../../../../../core/constants/chains.js'
import { TimePeriod } from '../../../../../core/constants/timePeriod.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0xdf0770dF86a8034b3EFEf0A1Bb3c889B8332FF56'],
    blockNumber: 19661888,
  },
  {
    key: 'farm-v1',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x432e73a263aa7a4b909ad8afecdda0479305e187',

      filterProtocolTokens: [
        '0x38EA452219524Bb87e18dE1C24D3bB59510BD783',
        '0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E',
        '0x38EA452219524Bb87e18dE1C24D3bB59510BD783',
      ],
    },

    blockNumber: 20634750,
  },
  {
    key: 'farm-v1',
    chainId: Chain.Ethereum,
    method: 'withdrawals',

    input: {
      userAddress: '0x93652aE25d0ba757c3C92A4Deb0b05dd1D4efE35',
      protocolTokenAddress: '0x38EA452219524Bb87e18dE1C24D3bB59510BD783',
      fromBlock: 20661441,
      toBlock: 20661441,
    },
  },
  {
    key: 'farm-v1',
    chainId: Chain.Ethereum,
    method: 'deposits',

    input: {
      userAddress: '0xBe108Eb162a86586F4A833Df52123Ab314e9AF5C',
      protocolTokenAddress: '0xdf0770dF86a8034b3EFEf0A1Bb3c889B8332FF56',
      fromBlock: 20649377,
      toBlock: 20649377,
    },
  },
  {
    key: 'farm-v1',
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0xA8de50E62D5313a93E25B1b205eaD61f74f22346',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0xdf0770dF86a8034b3EFEf0A1Bb3c889B8332FF56'],
    },

    blockNumber: 20613044,
  },
]
