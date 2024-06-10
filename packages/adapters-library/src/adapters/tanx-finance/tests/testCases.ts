import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    key: 'deposits1',
    input: {
      userAddress: '0xfCf0937622E5461E3644207faa1b2614F3E698E0',
      fromBlock: 19981060,
      toBlock: 19981080,
      protocolTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    key: 'deposits2',
    input: {
      userAddress: '0xfCf0937622E5461E3644207faa1b2614F3E698E0',
      fromBlock: 19976618,
      toBlock: 19977618,
      protocolTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      productId: 'dex',
    },
  },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'withdrawals',
  //   key: 'withdrawals1',
  //   input: {
  //     userAddress: '0xfCf0937622E5461E3644207faa1b2614F3E698E0',
  //     fromBlock: 19931050,
  //     toBlock: 19931950,
  //     protocolTokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
  //     productId: 'dex',
  //   },
  // },
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'withdrawals',
  //   key: 'withdrawals2',
  //   input: {
  //     userAddress: '0xfCf0937622E5461E3644207faa1b2614F3E698E0',
  //     fromBlock: 19975560,
  //     toBlock:   19977907,
  //     protocolTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  //     productId: 'dex',
  //   },
  // }
  // {
  //   chainId: Chain.Ethereum,
  //   method: 'profits',
  //   input: {
  //     userAddress: '0xCEadFdCCd0E8E370D985c49Ed3117b2572243A4a',
  //     timePeriod: TimePeriod.oneDay,
  //   },
  // },
  // {
  //   method: 'tx-params',
  //   key: 'supply',
  //   chainId: Chain.Ethereum,
  //   input: {
  //     productId: 'dex',
  //     action: WriteActions.Deposit,
  //     inputs: {
  //       asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  //       amount: '10000000000000000000',
  //     },
  //   },
  // },
]
