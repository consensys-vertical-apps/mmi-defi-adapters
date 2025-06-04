/**
 * Unique chain id of the blockchain
 */
export const EvmChain = {
  Ethereum: 1,
  Optimism: 10,
  Bsc: 56,
  Polygon: 137,
  Fantom: 250,
  Sei: 1329,
  Base: 8453,
  Arbitrum: 42161,
  Avalanche: 43114,
  Linea: 59144,
} as const
export type EvmChain = (typeof EvmChain)[keyof typeof EvmChain]

export const SolanaChain = {
  Solana: -1,
} as const
export type SolanaChain = (typeof SolanaChain)[keyof typeof SolanaChain]

export const Chain = {
  ...EvmChain,
  ...SolanaChain,
} as const
export type Chain = (typeof Chain)[keyof typeof Chain]

export const ChainName = {
  [Chain.Ethereum]: 'ethereum',
  [Chain.Optimism]: 'op',
  [Chain.Bsc]: 'bsc',
  [Chain.Polygon]: 'matic',
  [Chain.Fantom]: 'ftm',
  [Chain.Sei]: 'sei',
  [Chain.Base]: 'base',
  [Chain.Arbitrum]: 'arb',
  [Chain.Avalanche]: 'avax',
  [Chain.Linea]: 'linea',
  [Chain.Solana]: 'solana',
} as const
export type ChainName = (typeof ChainName)[keyof typeof ChainName]
