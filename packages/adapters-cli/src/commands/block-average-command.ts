import { promises as fs } from 'node:fs'
import {
  Chain,
  DefiProvider,
  EvmChain,
  multiChainFilter,
} from '@metamask-institutional/defi-adapters'
import { Command } from 'commander'
import EthDater from 'ethereum-block-by-date'
import { type JsonRpcProvider } from 'ethers'
import { parse, print, types, visit } from 'recast'
import { writeAndLintFile } from '../utils/write-and-lint-file.js'

import n = types.namedTypes

export function blockAverageCommand(program: Command) {
  program
    .command('block-average')
    .option(
      '-c, --chains <chains>',
      'comma-separated chain filter (e.g. ethereum,arbitrum,linea)',
    )
    .showHelpAfterError()
    .action(async ({ chains: chainFilterInput }) => {
      const filterChainIds = multiChainFilter(chainFilterInput)

      const defiProvider = new DefiProvider()

      const averageBlocksPerDayMap = await Object.values(EvmChain)
        .filter((chainId) => {
          return !filterChainIds || filterChainIds.includes(chainId)
        })
        .map(async (chainId) => {
          let averageBlocksPerDay: number

          try {
            averageBlocksPerDay = await getAverageBlocksPerDay(
              chainId,
              defiProvider.chainProvider.providers as unknown as Record<
                EvmChain,
                JsonRpcProvider
              >,
            )
          } catch (e) {
            console.error(
              `Failed to fetch average blocks per day for chain ${chainId}`,
            )
            averageBlocksPerDay = 0
          }

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
  chainId: EvmChain,
  chainProviders: Record<EvmChain, JsonRpcProvider>,
) {
  const provider = chainProviders[chainId]

  const currentBlock = await provider.getBlock('latest')
  if (!currentBlock) {
    throw new Error(`No block data for chain: ${chainId}`)
  }

  // EthDater types throw when using an ethersv6 provider, it is supported though
  // biome-ignore lint/suspicious/noExplicitAny: We are using ethersv6, but it requires an ethersv5 object
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
  const averageBlocksFile =
    './packages/adapters-library/src/core/constants/AVERAGE_BLOCKS_PER_DAY.ts'
  const contents = await fs.readFile(averageBlocksFile, 'utf-8')
  const ast = parse(contents, {
    parser: await import('recast/parsers/typescript.js'),
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

  await writeAndLintFile(averageBlocksFile, print(ast).code)
}
