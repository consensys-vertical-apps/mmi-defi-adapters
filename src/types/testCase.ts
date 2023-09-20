import type { Chain } from '../core/constants/chains'
import type { TimePeriod } from '../core/constants/timePeriod'

export type TestCase = {
  key?: string
  chainId: Chain
} & (
  | {
      method: 'positions'
      input: { userAddress: string }
      blockNumber?: number
    }
  | {
      method: 'profits'
      input: { userAddress: string; timePeriod?: TimePeriod }
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
