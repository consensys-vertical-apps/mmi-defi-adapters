import { Chain } from '../../../../../core/constants/chains.js'
import type { TestCase } from '../../../../../types/testCase.js'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xA20EA526a2B2e2471A43Cb981D613FEeeF27c9AF',
      filterProtocolTokens: ['0xf951E335afb289353dc249e82926178EaC7DEd78'],
    },
    blockNumber: 18642232,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xA20EA526a2B2e2471A43Cb981D613FEeeF27c9AF',
      filterProtocolTokens: ['0xf951E335afb289353dc249e82926178EaC7DEd78'],
    },
    blockNumber: 18642232,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0xf951E335afb289353dc249e82926178EaC7DEd78',
    blockNumber: 19661890,
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xe4286256CFc49394343BC99Ea49B999df2733b3f',
      fromBlock: 18640800,
      toBlock: 18640810,
      protocolTokenAddress: '0xf951E335afb289353dc249e82926178EaC7DEd78',
    },
  },
]
