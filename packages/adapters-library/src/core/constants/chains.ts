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

/**
 * Chain name map
 */
export const ChainName: Record<Chain, string> = {
  [Chain.Ethereum]: 'ethereum',
  [Chain.Optimism]: 'op',
  [Chain.Bsc]: 'bsc',
  [Chain.Polygon]: 'matic',
  [Chain.Fantom]: 'ftm',
  [Chain.Base]: 'base',
  [Chain.Arbitrum]: 'arb',
  [Chain.Avalanche]: 'avax',
  [Chain.Linea]: 'linea',
}
