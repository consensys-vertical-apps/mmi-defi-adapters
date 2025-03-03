import type { Chain } from '../core/constants/chains.js'

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
      method: 'prices'
      filterProtocolToken: string
      blockNumber?: number
      filterTokenId?: string
    }
)
