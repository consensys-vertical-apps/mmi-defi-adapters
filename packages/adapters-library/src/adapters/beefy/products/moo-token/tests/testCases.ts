import { Chain } from '../../../../../core/constants/chains'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    key: 'moo-token',
    method: 'deposits',
    input: {
      fromBlock: 20062163,
      toBlock: 20068824,
      userAddress: '0xE582B5233e2b64AaC98076B13E3DfCf072D91cC8',
      protocolTokenAddress: '0xBF7fc2A3d96d80f47b3b89BE84afe10376CE96A5',
    },
  },
  {
    chainId: Chain.Ethereum,
    key: 'moo-token',
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',

      filterProtocolTokens: ['0x5dA90BA82bED0AB701E6762D2bF44E08634d9776'],
    },
    blockNumber: 20035548,
  },
  {
    chainId: Chain.Ethereum,
    key: 'moo-token',
    method: 'withdrawals',
    input: {
      fromBlock: 20073364,
      toBlock: 20073564,
      userAddress: '0xf2c929c22d491c2a2c4ec92ec6c2c11e6b861428',
      protocolTokenAddress: '0xBF7fc2A3d96d80f47b3b89BE84afe10376CE96A5',
    },
  },
]
