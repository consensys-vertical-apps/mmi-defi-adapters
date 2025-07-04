import type { Chain } from '../core/constants/chains'

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
        openingPositionTxHash?: string
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
