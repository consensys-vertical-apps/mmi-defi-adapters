import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    key: 'reth',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
      filterProtocolTokens: ['0xae78736Cd615f374D3085123A210448E74Fc6393'],
    },
    blockNumber: 19074240,
  },
  {
    key: 'reth',
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x742b8ea0754e4ac12b3f72e92d686c0b0664eee4',
      filterProtocolTokens: ['0xae78736Cd615f374D3085123A210448E74Fc6393'],
    },
    blockNumber: 19184815,
  },
  {
    key: 'reth',
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    blockNumber: 19661887,
  },
  {
    key: 'reth',
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0xae78736Cd615f374D3085123A210448E74Fc6393'],
    blockNumber: 19074240,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0x4ea4d86c2dcadb881bccaad5d28a14b80d6aa1ef',
      fromBlock: 18849115,
      toBlock: 19074904,
      protocolTokenAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
      productId: 'reth',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0x742b8ea0754e4ac12b3f72e92d686c0b0664eee4',
      fromBlock: 18849115,
      toBlock: 19074240,
      protocolTokenAddress: '0xae78736Cd615f374D3085123A210448E74Fc6393',
      productId: 'reth',
    },
  },
]
