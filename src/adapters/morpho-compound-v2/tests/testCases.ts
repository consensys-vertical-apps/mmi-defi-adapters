import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',

      filterProtocolTokens: [
        '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
        '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
        '0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9',
      ],
    },
    blockNumber: 18776256,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',
      timePeriod: TimePeriod.oneDay,
      includeRawValues: true,

      filterProtocolTokens: [
        '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
        '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
        '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
      ],
    },
    blockNumber: 18802919 + 1,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    blockNumber: 18776256,
  },

  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      userAddress: '0xc3Fd2bcB524af31963b3E3bB670F28bA14718244',
      fromBlock: 18802935 - 1,
      toBlock: 18802935 + 1,
      protocolTokenAddress: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
      productId: 'optimizer-supply',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',
      fromBlock: 18761091 - 1,
      toBlock: 18761091 + 1,
      protocolTokenAddress: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
      productId: 'optimizer-supply',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'repays',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',
      fromBlock: 19045223 - 1,
      toBlock: 19045223 + 1,
      protocolTokenAddress: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
      productId: 'optimizer-borrow',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'borrows',
    input: {
      userAddress: '0xc3fd2bcb524af31963b3e3bb670f28ba14718244',
      fromBlock: 18761149 - 1,
      toBlock: 18761149 + 1,
      protocolTokenAddress: '0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9',
      productId: 'optimizer-borrow',
    },
  },
]
