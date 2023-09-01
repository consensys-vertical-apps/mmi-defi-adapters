import { Command } from 'commander'
import EthDater from 'ethereum-block-by-date'
import { promises as fs } from 'fs'
import * as path from 'path'
import { parse, visit, types, print } from 'recast'
import { Chain } from '../core/constants/chains'
import { chainProviders } from '../core/utils/chainProviders'
import { writeCodeFile } from './writeCodeFile'

import n = types.namedTypes

export function blockAverage(program: Command) {
  program
    .command('block-average')
    .option('-c, --chain <chainId>', 'chain filter')
    .showHelpAfterError()
    .action(async ({ chain: chainFilter }) => {
      const averageBlocksPerDayMap = await Object.values(Chain)
        .filter(
          (chainId) => !chainFilter || chainId === parseInt(chainFilter, 10),
        )
        .map(async (chainId) => {
          const averageBlocksPerDay = await getAverageBlocksPerDay(chainId)

          return {
            chainId,
            averageBlocksPerDay,
          }
        })
        .reduce(
          async (accumulator, current) => {
            const { chainId, averageBlocksPerDay } = await current
            return {
              ...(await accumulator),
              [chainId]: averageBlocksPerDay,
            }
          },
          Promise.resolve({}) as Promise<Partial<Record<Chain, number>>>,
        )

      updateAverages(averageBlocksPerDayMap)
    })
}

async function getAverageBlocksPerDay(chainId: Chain) {
  const provider = chainProviders[chainId]

  if (!provider) {
    throw new Error('No provider for chain')
  }

  const dater = new EthDater(provider)

  const currentBlock = await provider.getBlock('latest')

  // 30 days * 24 hours/day * 60 minutes/hour * 60 seconds/minute
  const thirtyDaysTimestamp = currentBlock.timestamp - 30 * 24 * 60 * 60

  // Value needs to be given in milliseconds, thus the * 1000
  const thirtyDaysBlock = await dater.getDate(thirtyDaysTimestamp * 1000)

  return Math.round((currentBlock.number - thirtyDaysBlock.block) / 30)
}

async function updateAverages(
  averageBlocksPerDayMap: Partial<Record<Chain, number>>,
) {
  const averageBlocksFile = path.resolve(
    './src/core/constants/AVERAGE_BLOCKS_PER_DAY.ts',
  )
  const contents = await fs.readFile(averageBlocksFile, 'utf-8')
  const ast = parse(contents, {
    parser: require('recast/parsers/typescript'),
  })

  visit(ast, {
    // Iterates over every entry of AVERAGE_BLOCKS_PER_DAY and updates it
    visitObjectProperty(path) {
      if (
        !n.MemberExpression.check(path.node.key) ||
        !n.Identifier.check(path.node.key.property) ||
        !n.NumericLiteral.check(path.node.value)
      ) {
        throw new Error('Incorrectly formatted AVERAGE_BLOCKS_PER_DAY object')
      }
      const chainKey = path.node.key.property.name as keyof typeof Chain

      const averageBlocksPerDay = averageBlocksPerDayMap[Chain[chainKey]]
      if (averageBlocksPerDay) {
        const averageBlocksPerDayNode = path.node.value
        averageBlocksPerDayNode.value = averageBlocksPerDay
      }

      this.traverse(path)
    },
  })

  await writeCodeFile(averageBlocksFile, print(ast).code)
}
