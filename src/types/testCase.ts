import type { Chain } from '../core/constants/chains'
import type { TimePeriod } from '../core/constants/timePeriod'

export type TestCase = {
  key?: string
  chainId: Chain
} & (
  | {
      method: 'positions'
      input: { userAddress: string; filterProtocolTokens?: string[] }
      blockNumber?: number
    }
  | {
      method: 'profits'
      input: {
        userAddress: string
        timePeriod?: TimePeriod
        includeRawValues?: boolean
        filterProtocolTokens?: string[]
      }
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
      method: 'repays'
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
      method: 'borrows'
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
      filterProtocolToken?: string
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
  | {
      method: 'tx-params'
      input: {
        productId: string
        action: string
        inputs: unknown[]
      }
    }
)
