import { Chain } from '../core/constants/chains'

export type TestCase = {
  id: string
  chainId: Chain
} & (
  | {
      method: 'positions'
      input: { userAddress: string }
    }
  | {
      method: 'profits'
      input: { userAddress: string }
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
    }
)
