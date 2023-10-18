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
      input: {
        userAddress: string
        fromBlock: number
        toBlock: number
        protocolTokenAddress: string
        productId: string
        tokenId?: string
      }
    }
  | {
      method: 'withdrawals'
      input: {
        userAddress: string
        fromBlock: number
        toBlock: number
        protocolTokenAddress: string
        productId: string
        tokenId?: string
      }
    }
  | {
      method: 'prices'
      blockNumber?: number
    }
  | {
      method: 'tvl'
      blockNumber?: number
    }
  | {
      method: 'apy'
      blockNumber?: number
    }
  | {
      method: 'apr'
      blockNumber?: number
    }
)
