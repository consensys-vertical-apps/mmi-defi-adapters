import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'pool-v1-and-stake',
    input: {
      userAddress: '0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255',

      filterProtocolTokens: [
        '0xdf0770dF86a8034b3EFEf0A1Bb3c889B8332FF56',
        '0x0e42acBD23FAee03249DAFF896b78d7e79fBD58E',
      ],
    },
    blockNumber: 18163124,
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: 'pool-v1',
    input: {
      userAddress: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
      fromBlock: 18156819,
      toBlock: 18163965,
      protocolTokenAddress: '0xdf0770df86a8034b3efef0a1bb3c889b8332ff56',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    key: 'pool-v1',
    input: {
      userAddress: '0x2C5D4A0943e9cF4C597a76464396B0bF84C24C45',
      fromBlock: 17719334,
      toBlock: 17719336,
      protocolTokenAddress: '0xdf0770df86a8034b3efef0a1bb3c889b8332ff56',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: 'pool-v1',
    input: {
      userAddress: '0xCEadFdCCd0E8E370D985c49Ed3117b2572243A4a',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0xE8F55368C82D38bbbbDb5533e7F56AfC2E978CC2'],
    },
    blockNumber: 18163965,
  },
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
  {
    key: 'pool-v2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x006fbb8a8aeb9982b54ec213a675a19b121b3423',
      filterProtocolTokens: ['0xfcb42A0e352a08AbD50b8EE68d01f581B6Dfd80A'],
    },

    blockNumber: 20636813,
  },
  {
    key: 'pool-v2',
    chainId: Chain.Base,
    method: 'positions',

    input: {
      userAddress: '0x006fbb8a8aeb9982b54ec213a675a19b121b3423',
      filterProtocolTokens: ['0x98fB8522d891F43B771e2d27367b41Ba138D0B80'],
    },

    blockNumber: 19088200,
  },
  {
    key: 'farm-v2',
    chainId: Chain.Ethereum,
    method: 'positions',

    input: {
      userAddress: '0x730964F8850708D16f6E455346EB7BC8042c737B',
      filterProtocolTokens: ['0x17BBC9BD51A52aAf4d2CC6652630DaF4fdB358F7'],
    },

    blockNumber: 20641851,
  },
  {
    key: 'farm-v2',
    chainId: Chain.Ethereum,
    method: 'profits',

    input: {
      userAddress: '0x1EF1258341086d4a9566f797Da15FcfDc92bb3B8',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0xfcb42A0e352a08AbD50b8EE68d01f581B6Dfd80A'],
    },

    blockNumber: 20662804,
  },
  {
    key: 'farm-v2',
    chainId: Chain.Ethereum,
    method: 'withdrawals',

    input: {
      userAddress: '0x1EF1258341086d4a9566f797Da15FcfDc92bb3B8',
      protocolTokenAddress: '0xfcb42a0e352a08abd50b8ee68d01f581b6dfd80a',
      fromBlock: 20661895,
      toBlock: 20661895,
    },
  },
]
