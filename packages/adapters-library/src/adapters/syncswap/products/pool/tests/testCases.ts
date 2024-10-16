import { Chain } from '../../../../../core/constants/chains'
import { TimePeriod } from '../../../../../core/constants/timePeriod'
import type { TestCase } from '../../../../../types/testCase'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Linea,
    method: 'positions',
    input: {
      userAddress: '0x00000000863b56a3c1f0f1be8bc4f8b7bd78f57a',
      filterProtocolTokens: ['0x7f72E0D8e9AbF9133A92322b8B50BD8e0F9dcFCB'],
    },
    blockNumber: 1175771,
  },
  {
    chainId: Chain.Linea,
    key: 'deposits-1',
    method: 'deposits',
    input: {
      userAddress: '0x002748db885d4ccfe3c7c92143f0805f4ebeec01',
      fromBlock: 70000,
      toBlock: 72000,
      protocolTokenAddress: '0x7f72e0d8e9abf9133a92322b8b50bd8e0f9dcfcb',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'deposits-2',
    method: 'deposits',
    input: {
      userAddress: '0x00000000863b56a3c1f0f1be8bc4f8b7bd78f57a',
      fromBlock: 445595,
      toBlock: 445598,
      protocolTokenAddress: '0x7f72e0d8e9abf9133a92322b8b50bd8e0f9dcfcb',
    },
  },
  {
    chainId: Chain.Linea,
    method: 'withdrawals',
    input: {
      userAddress: '0x0000001089167600c25258da29d2e2c857ec1689',
      fromBlock: 1149433,
      toBlock: 1150740,
      protocolTokenAddress: '0x8aebffb3964ec5cea0915080ddc1aca079583a4d',
    },
  },
  {
    chainId: Chain.Linea,
    key: 'profit1',
    method: 'profits',
    input: {
      userAddress: '0x00000000863b56a3c1f0f1be8bc4f8b7bd78f57a',
      timePeriod: TimePeriod.sevenDays,
      filterProtocolTokens: ['0x7f72E0D8e9AbF9133A92322b8B50BD8e0F9dcFCB'],
    },
    blockNumber: 645596,
  },
  {
    chainId: Chain.Linea,
    key: 'profit2',
    method: 'profits',
    input: {
      userAddress: '0x006430fcbd1e29275c4058fc278b78a486f8a69e',
      timePeriod: TimePeriod.sevenDays,

      filterProtocolTokens: [
        '0xd71EcE20343233aD9E7ce29bc954b813f41FbDcB',
        '0x46eC4BB184528C3aEE6F1419E11b28A97f33d483',
      ],
    },
    blockNumber: 547455,
  },
]
