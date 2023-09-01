import { Command } from 'commander'
import EthDater from 'ethereum-block-by-date'
import { Chain } from '../core/constants/chains'
import { chainProviders } from '../core/utils/chainProviders'

export function blockAverage(program: Command) {
  program
    .command('block-average')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ chainFilter }) => {
      const averageBlocksPerDay = await Promise.all(
        Object.values(Chain).map(async (chainId) => {
          const provider = chainProviders[chainId]

          if (!provider) {
            throw new Error('No provider for chain')
          }

          const dater = new EthDater(provider)

          const currentBlock = await provider.getBlock('latest')

          // 30 days * 24 hours/day * 60 minutes/hour * 60 seconds/minute
          const thirtyDaysTimestamp = currentBlock.timestamp - 30 * 24 * 60 * 60

          // Value needs to be given in milliseconds, thus the * 1000
          const thirtyDaysBlock = await dater.getDate(
            thirtyDaysTimestamp * 1000,
          )

          const averageBlocksPerDay = Math.round(
            (currentBlock.number - thirtyDaysBlock.block) / 30,
          )

          return {
            chainId,
            averageBlocksPerDay,
          }
        }),
      )

      console.log(averageBlocksPerDay)
    })
}
