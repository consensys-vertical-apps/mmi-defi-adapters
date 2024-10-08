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

export const ChainNames = {
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
export type ChainNames = (typeof ChainNames)[keyof typeof ChainNames]

/**
 * Chain name map
 */
export const ChainIdToChainNameMap = {
  [Chain.Ethereum]: ChainNames.ethereum,
  [Chain.Optimism]: ChainNames.op,
  [Chain.Bsc]: ChainNames.bsc,
  [Chain.Polygon]: ChainNames.matic,
  [Chain.Fantom]: ChainNames.ftm,
  [Chain.Base]: ChainNames.base,
  [Chain.Arbitrum]: ChainNames.arb,
  [Chain.Avalanche]: ChainNames.avax,
  [Chain.Linea]: ChainNames.linea,
} as const
export type ChainIdToChainNameMap =
  (typeof ChainIdToChainNameMap)[keyof typeof ChainIdToChainNameMap]
