import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    blockNumber: 18471029,
    input: {
      userAddress: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
      filterProtocolTokens: ['0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'],
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    key: 'voting-escrow',
    input: {
      userAddress: '0x394A16eeA604fBD86B0b45184b2d790c83a950E3',
      filterProtocolTokens: ['0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2'],
    },

    blockNumber: 19562097,
  },
  {
    method: 'deposits',
    chainId: Chain.Ethereum,
    input: {
      userAddress: '0xc42cEb990DeB305520C4527F2a841506095A55D6',
      fromBlock: 19562097,
      toBlock: 19562099,
      protocolTokenAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
      productId: 'voting-escrow',
    },
  },
  {
    method: 'withdrawals',
    chainId: Chain.Ethereum,
    input: {
      userAddress: '0x287B780DA1dE8f332ee9A7709822217e2F24843A',
      fromBlock: 19564305,
      toBlock: 19564307,
      protocolTokenAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
      productId: 'voting-escrow',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    key: 'voting-escrow',
    input: {
      userAddress: '0x394A16eeA604fBD86B0b45184b2d790c83a950E3',
      filterProtocolTokens: ['0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2'],
    },
    blockNumber: 19316971,
  },
  {
    chainId: Chain.Ethereum,
    key: 'position2',
    method: 'positions',
    blockNumber: 18571794,
    input: {
      userAddress: '0x492d896d2244026a60cf3c46ec742d041a34c4cb',
      filterProtocolTokens: [
        '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
        '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
      ],
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    blockNumber: 19184953,
    input: {
      userAddress: '0xeb6CF828ACADADF91341C04140216Fa65f26B296',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'],
    },
  },
  {
    chainId: Chain.Ethereum,
    key: 'profits2',
    method: 'profits',
    blockNumber: 19184953,
    input: {
      userAddress: '0xeb6CF828ACADADF91341C04140216Fa65f26B296',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'],
    },
  },
]
