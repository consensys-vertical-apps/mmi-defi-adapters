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
export const ChainName: Record<Chain, string> = {
  [Chain.Ethereum]: 'ethereum',
  [Chain.Optimism]: 'optimism',
  [Chain.Bsc]: 'bsc',
  [Chain.Polygon]: 'polygon',
  [Chain.Fantom]: 'fantom',
  [Chain.Base]: 'base',
  [Chain.Arbitrum]: 'arbitrum',
  [Chain.Avalanche]: 'avalanche',
  [Chain.Linea]: 'linea',
}
