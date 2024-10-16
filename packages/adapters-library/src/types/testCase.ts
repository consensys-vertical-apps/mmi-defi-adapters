import type { GetTransactionParams } from '../adapters/supportedProtocols'
import type { Chain } from '../core/constants/chains'
import type { TimePeriod } from '../core/constants/timePeriod'

export type TestCase = {
  key?: string
  chainId: Chain
} & (
  | {
      method: 'positions'
      input: {
        userAddress: string
        filterProtocolTokens?: string[]
        filterTokenIds?: string[]
      }
      blockNumber?: number
    }
  | {
      method: 'profits'
      input: {
        userAddress: string
        timePeriod?: TimePeriod
        includeRawValues?: boolean
        filterProtocolTokens?: string[]
        filterTokenIds?: string[]
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
        tokenId?: string
      }
    }
  | {
      method: 'prices'
      filterProtocolToken: string
      blockNumber?: number
      filterTokenId?: string
    }
  | {
      method: 'tvl'
      filterProtocolTokens: string[]
      blockNumber?: number
    }
  | {
      method: 'tx-params'
      input: Omit<GetTransactionParams, 'protocolId' | 'chainId' | 'productId'>
    }
)
