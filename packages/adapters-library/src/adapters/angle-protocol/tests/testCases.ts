import { Chain } from '../../../core/constants/chains'
import { TimePeriod } from '../../../core/constants/timePeriod'
import type { TestCase } from '../../../types/testCase'
import { WriteActions } from '../../../types/writeActions'

export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'withdrawals',
    input: {
      productId: 'savings',
      userAddress: '0xe3b72489968F11c15282514F33DF24634440393f',
      fromBlock: 19404491,
      toBlock: 19404493,
      protocolTokenAddress: '0x004626A008B1aCdC4c74ab51644093b155e59A23',
    },
  },
  {
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      productId: 'savings',
      userAddress: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      fromBlock: 19410812,
      toBlock: 19410814,
      protocolTokenAddress: '0x004626A008B1aCdC4c74ab51644093b155e59A23',
    },
  },
  {
    key: 'positions',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',

      filterProtocolTokens: [
        '0x004626A008B1aCdC4c74ab51644093b155e59A23',
        '0x0022228a2cc5E7eF0274A7Baa600d44da5aB5776',
      ],
    },
    blockNumber: 19410813,
  },
  {
    key: 'positions-filter',
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      filterProtocolTokens: ['0x004626A008B1aCdC4c74ab51644093b155e59A23'],
    },
    blockNumber: 19410813,
  },
  {
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      timePeriod: TimePeriod.oneDay,
      filterProtocolTokens: ['0x004626A008B1aCdC4c74ab51644093b155e59A23'],
    },
    blockNumber: 19410813,
  },
  {
    chainId: Chain.Ethereum,
    method: 'prices',
    filterProtocolToken: '0x004626A008B1aCdC4c74ab51644093b155e59A23',
    blockNumber: 19544644,
  },
  {
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0x004626A008B1aCdC4c74ab51644093b155e59A23'],
    blockNumber: 19661876,
  },
  {
    key: 'tx-params-savings-deposit',
    method: 'tx-params',
    chainId: Chain.Ethereum,
    input: {
      productId: 'savings',
      action: WriteActions.Deposit,
      inputs: {
        asset: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
        amount: '10000000000000000000',
        receiver: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      },
    },
  },
  {
    key: 'tx-params-savings-withdraw',
    method: 'tx-params',
    chainId: Chain.Ethereum,
    input: {
      productId: 'savings',
      action: WriteActions.Withdraw,
      inputs: {
        asset: '0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8',
        amount: '10000000000000000000',
        receiver: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
        owner: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      },
    },
  },
  {
    key: 'tx-params-transmuter-deposit',
    method: 'tx-params',
    chainId: Chain.Ethereum,
    input: {
      productId: 'transmuter',
      action: WriteActions.Deposit,
      inputs: {
        asset: '0x0000206329b97DB379d5E1Bf586BbDB969C63274',
        amount: '10000000000000000000',
        receiver: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      },
    },
  },
  {
    key: 'tx-params-transmuter-withdraw',
    method: 'tx-params',
    chainId: Chain.Ethereum,
    input: {
      productId: 'transmuter',
      action: WriteActions.Withdraw,
      inputs: {
        asset: '0x0000206329b97DB379d5E1Bf586BbDB969C63274',
        amount: '10000000000000000000',
        receiver: '0xB0b0F6F13A5158eB67724282F586a552E75b5728',
      },
    },
  },
]
