export const ChainIdToChainNameMap = {
  [1]: 'Ethereum',
  [10]: 'Optimism',
  [56]: 'Bsc',
  [137]: 'Polygon',
  [250]: 'Fantom',
  [8453]: 'Base',
  [42161]: 'Arbitrum',
  [43114]: 'Avalanche',
  [59144]: 'Linea',
} as const
export type ChainIdToChainNameMap =
  (typeof ChainIdToChainNameMap)[keyof typeof ChainIdToChainNameMap]
