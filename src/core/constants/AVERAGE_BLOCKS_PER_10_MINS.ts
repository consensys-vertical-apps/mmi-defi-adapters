import { AVERAGE_BLOCKS_PER_DAY } from './AVERAGE_BLOCKS_PER_DAY'
import { Chain } from './chains'

export const AVERAGE_BLOCKS_PER_10_MINUTES: Record<Chain, number> =
  Object.entries(AVERAGE_BLOCKS_PER_DAY).reduce(
    (acc, [chain, blocksPerDay]) => {
      acc[chain as unknown as Chain] = (blocksPerDay * 10) / (24 * 60)
      return acc
    },
    {} as Record<Chain, number>,
  )
