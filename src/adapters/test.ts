import { Chain } from '../core/constants/chains'

export type TestCase = {
  id: string
  chainId: Chain
} & (
  | {
      method: 'positions'
      input: { userAddress: string }
      blockNumber?: number
    }
  | {
      method: 'profits'
      input: { userAddress: string }
      blockNumber?: number
    }
  | {
      method: 'deposits'
      input: { userAddress: string; fromBlock: number; toBlock: number }
    }
  | {
      method: 'withdrawals'
      input: { userAddress: string; fromBlock: number; toBlock: number }
    }
  | {
      method: 'prices'
      blockNumber?: number
    }
)
