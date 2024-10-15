import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Base,
    method: 'withdrawals',
    input: {
      userAddress: '0xD4f9FE0039Da59e6DDb21bbb6E84e0C9e83D73eD',
      fromBlock: 17605195 - 1,
      toBlock: 17605195 + 1,
      protocolTokenAddress: '0xbeef010f9cb27031ad51e3333f9af9c6b1228183',
    },
    key: '9',
  },
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
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xDA44D84f8DE69fEBDa4C4e0B89fF24077413f4b0',
      fromBlock: 20417740,
      toBlock: 20417745,
      protocolTokenAddress: '0xd63070114470f685b75B74D60EEc7c1113d33a3D', // Usual vault
    },
    key: '13',
  },
  {
    chainId: Chain.Base,
    method: 'deposits',
    input: {
      userAddress: '0x7C818D46ACEf870ea88137BF553594f4803872cA',
      fromBlock: 17776688,
      toBlock: 17778933,
      protocolTokenAddress: '0xa0e430870c4604ccfc7b38ca7845b1ff653d0ff1', // mwETH Vault
    },
    key: '14',
  },
]
