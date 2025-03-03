import { AVERAGE_BLOCKS_PER_DAY } from './AVERAGE_BLOCKS_PER_DAY.js'
import type { Chain } from './chains.js'

export const AVERAGE_BLOCKS_PER_10_MINUTES: Record<Chain, number> =
  Object.entries(AVERAGE_BLOCKS_PER_DAY).reduce(
    (acc, [chain, blocksPerDay]) => {
      acc[chain as unknown as Chain] = Math.floor(
        (blocksPerDay * 10) / (24 * 60),
      )
      return acc
    },
    {} as Record<Chain, number>,
  )
