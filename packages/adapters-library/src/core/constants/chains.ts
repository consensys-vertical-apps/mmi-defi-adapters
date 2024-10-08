/**
 * Unique chain id of the blockchain
 */
export const Chain = {
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
export type Chain = (typeof Chain)[keyof typeof Chain]

export const ChainName = {
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
} as const
export type ChainIdToChainNameMap =
  (typeof ChainIdToChainNameMap)[keyof typeof ChainIdToChainNameMap]
