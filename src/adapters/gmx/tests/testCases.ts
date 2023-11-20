import { Chain } from '../../../core/constants/chains'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Arbitrum,
    method: 'positions',
    input: {
      userAddress: '0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50',
    },
    blockNumber: 150947313,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'profits',
    input: {
      userAddress: '0x27fae42e93707f93018c965cf3f16a67d848d1ff',
    },
    blockNumber: 151045028,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'prices',
    blockNumber: 150947313,
  },
  {
    chainId: Chain.Arbitrum,
    method: 'deposits',
    input: {
      userAddress: '0x27fae42e93707f93018c965cf3f16a67d848d1ff',
      fromBlock: 151045020,
      toBlock: 151045028,
      protocolTokenAddress: '0x4277f8f2c384827b5273592ff7cebd9f2c1ac258',
      productId: 'glp',
    },
  },
]
