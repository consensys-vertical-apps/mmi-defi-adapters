/**
 * Unique chain id of the blockchain
 */
export const EvmChain = {
  Ethereum: 1,
  Optimism: 10,
  Bsc: 56,
  Polygon: 137,
  Fantom: 250,
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

export const EvmChainName = {
  ethereum: 'ethereum',
  op: 'op',
  bsc: 'bsc',
  matic: 'matic',
  ftm: 'ftm',
  base: 'base',
  arb: 'arb',
  avax: 'avax',
  linea: 'linea',
} as const
export type EvmChainName = (typeof EvmChainName)[keyof typeof EvmChainName]

export const SolanaChainName = {
  solana: 'solana',
} as const
export type SolanaChainName =
  (typeof SolanaChainName)[keyof typeof SolanaChainName]

export const ChainName = {
  ...EvmChainName,
  ...SolanaChainName,
} as const
export type ChainName = (typeof ChainName)[keyof typeof ChainName]

/**
 * Chain name map
 */
export const ChainIdToChainNameMap = {
  [Chain.Ethereum]: ChainName.ethereum,
  [Chain.Optimism]: ChainName.op,
  [Chain.Bsc]: ChainName.bsc,
  [Chain.Polygon]: ChainName.matic,
  [Chain.Fantom]: ChainName.ftm,
  [Chain.Base]: ChainName.base,
  [Chain.Arbitrum]: ChainName.arb,
  [Chain.Avalanche]: ChainName.avax,
  [Chain.Linea]: ChainName.linea,
  [Chain.Solana]: ChainName.solana,
} as const
export type ChainIdToChainNameMap =
  (typeof ChainIdToChainNameMap)[keyof typeof ChainIdToChainNameMap]
