import { Chain } from './chains'

// TODO - Fill average blocks per day
export const AVERAGE_BLOCKS_PER_DAY: Record<Chain, number> = {
  [Chain.Ethereum]: 7163,
  [Chain.Optimism]: 0,
  [Chain.Bsc]: 0,
  [Chain.Polygon]: 0,
  [Chain.Fantom]: 0,
  [Chain.Base]: 0,
  [Chain.Arbitrum]: 340000,
  [Chain.Avalanche]: 0,
  [Chain.Linea]: 0,
}
