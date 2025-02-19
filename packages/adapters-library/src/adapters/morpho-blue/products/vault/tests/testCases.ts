import { Chain } from '../../../../../core/constants/chains'

import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xDA44D84f8DE69fEBDa4C4e0B89fF24077413f4b0',
      filterProtocolTokens: ['0xd63070114470f685b75B74D60EEc7c1113d33a3D'], // Usual vault
    },
    blockNumber: 20417741, // Choose a recent block number
    key: '11',
  },
  {
    chainId: Chain.Base,
    method: 'positions',
    input: {
      userAddress: '0x7C818D46ACEf870ea88137BF553594f4803872cA',
      filterProtocolTokens: ['0xa0e430870c4604ccfc7b38ca7845b1ff653d0ff1'], // mwETH Vault
    },
    blockNumber: 17776788, // Choose a recent block number
    key: '12',
  },
]
