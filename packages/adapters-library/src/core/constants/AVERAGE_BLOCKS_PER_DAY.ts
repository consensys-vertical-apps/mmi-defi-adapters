import { Chain } from './chains'

// This file is updated automatically
export const AVERAGE_BLOCKS_PER_DAY: Record<Chain, number> = {
  [Chain.Ethereum]: 7146,
  [Chain.Optimism]: 43200,
  [Chain.Bsc]: 28692,
  [Chain.Polygon]: 39870,
  [Chain.Fantom]: 101173,
  [Chain.Sei]: 1, // TODO: Add real blocks per day for Sei
  [Chain.Base]: 43200,
  [Chain.Arbitrum]: 320278,
  [Chain.Avalanche]: 41413,
  [Chain.Linea]: 42698,
  [Chain.Solana]: 1, // TODO Add real blocks per day for Solana
}
