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
  {
    chainId: Chain.Polygon,
    method: 'deposits',
    key: 'deposits1',
    input: {
      userAddress: '0xAbb5236f34Ee7587E4B324cAE93993a9f8cC8010',
      fromBlock: 57786033,
      toBlock: 57786433,
      protocolTokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'deposits',
    key: 'deposits1',
    input: {
      userAddress: '0xd515969f02b613707d75fcee4bb4762f4c30c70a',
      fromBlock: 220527048,
      toBlock: 220528000,
      protocolTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Optimism,
    method: 'deposits',
    key: 'deposits1',
    input: {
      userAddress: '0x9dBA0BdC3cdf271A21902D8b9a6092b4925C90Eb',
      fromBlock: 120772614,
      toBlock: 120774614,
      protocolTokenAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'deposits',
    key: 'deposits1',
    input: {
      userAddress: '0x568927D2426a3B5ebb3d2C5A5CC09BaE1144AEd1',
      fromBlock: 5336329,
      toBlock: 5339329,
      protocolTokenAddress: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: 'withdrawals1',
    input: {
      userAddress: '0xfCf0937622E5461E3644207faa1b2614F3E698E0',
      fromBlock: 19931050,
      toBlock: 19931950,
      protocolTokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    key: 'withdrawals2',
    input: {
      userAddress: '0xfCf0937622E5461E3644207faa1b2614F3E698E0',
      fromBlock: 19975560,
      toBlock: 19977907,
      protocolTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Polygon,
    method: 'withdrawals',
    key: 'withdrawals1',
    input: {
      userAddress: '0xcc2f3f43a28dc59a0834b23feeb84cfa2dc65a0b',
      fromBlock: 57943658,
      toBlock: 57945658,
      protocolTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Arbitrum,
    method: 'withdrawals',
    key: 'withdrawals1',
    input: {
      userAddress: '0xcc62bAFC0dA6E81cFCc164B9cC04aA4bBC0daB5f',
      fromBlock: 220492500,
      toBlock: 220494500,
      protocolTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'withdrawals',
    key: 'withdrawals1',
    input: {
      userAddress: '0x7cC580211CF73B189178d9D4cCbe577f09496ADb',
      fromBlock: 5324197,
      toBlock: 5326197,
      protocolTokenAddress: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      productId: 'dex',
    },
  },
  {
    chainId: Chain.Optimism,
    method: 'withdrawals',
    key: 'withdrawals1',
    input: {
      userAddress: '0x0d39d6d133dc3D0d673b1630a415F74e9d84E488',
      fromBlock: 120144687,
      toBlock: 120146687,
      protocolTokenAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      productId: 'dex',
    },
  },
]
