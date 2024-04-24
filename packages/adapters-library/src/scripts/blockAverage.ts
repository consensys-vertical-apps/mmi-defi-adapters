import { promises as fs } from 'fs'
import { Command } from 'commander'
import EthDater from 'ethereum-block-by-date'
import { ethers } from 'ethers'
import { parse, print, types, visit } from 'recast'
import { Chain } from '../core/constants/chains'
import { ProviderMissingError } from '../core/errors/errors'
import { writeCodeFile } from '../core/utils/writeCodeFile'
import { multiChainFilter } from './commandFilters'
import n = types.namedTypes

export function blockAverage(
  program: Command,
  chainProviders: Record<Chain, ethers.JsonRpcApiProvider>,
) {
  program
    .command('block-average')
    .option(
      '-c, --chains <chains>',
      'comma-separated chain filter (e.g. ethereum,arbitrum,linea)',
    )
    .showHelpAfterError()
    .action(async ({ chains: chainFilterInput }) => {
      const filterChainIds = multiChainFilter(chainFilterInput)

      const averageBlocksPerDayMap = await Object.values(Chain)
        .filter((chainId) => {
          return !filterChainIds || filterChainIds.includes(chainId)
        })
        .map(async (chainId) => {
          const averageBlocksPerDay = await getAverageBlocksPerDay(
            chainId,
            chainProviders,
          )

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

async function getAverageBlocksPerDay(
  chainId: Chain,
  chainProviders: Record<Chain, ethers.JsonRpcApiProvider>,
) {
  const provider = chainProviders[chainId]

  if (!provider) {
    throw new ProviderMissingError(chainId)
  }

  const currentBlock = await provider.getBlock('latest')
  if (!currentBlock) {
    throw new Error(`No block data for chain: ${chainId}`)
  }

  // EthDater types throw when using an ethersv6 provider, it is supported though
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dater = new EthDater(provider as any)

  // 30 days * 24 hours/day * 60 minutes/hour * 60 seconds/minute
  const thirtyDaysTimestamp = currentBlock.timestamp - 30 * 24 * 60 * 60

  // Value needs to be given in milliseconds, thus the * 1000
  // EthDater.getDate returns a promise, the type is wrong
  const thirtyDaysBlock = await dater.getDate(thirtyDaysTimestamp * 1000)

  return Math.round((currentBlock.number - thirtyDaysBlock.block) / 30)
}

async function updateAverages(
  averageBlocksPerDayMap: Partial<Record<Chain, number>>,
) {
  const averageBlocksFile = './src/core/constants/AVERAGE_BLOCKS_PER_DAY.ts'
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
