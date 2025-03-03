import path from 'node:path'
import {
  Chain,
  EvmChain,
  multiChainFilter,
} from '@metamask-institutional/defi-adapters'
import { runner } from '@metamask-institutional/workers'
import type { Command } from 'commander'

export function buildCacheCommands(program: Command) {
  program
    .command('build-historic-cache')
    .option(
      '-c, --chain <chain>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-b, --block <block>',
      'optional block number to start indexing from',
    )
    .showHelpAfterError()
    .action(async ({ chain, block }: { chain?: string; block?: string }) => {
      await startCacheBuilders({ chain, block, type: 'historic' })
    })

  program
    .command('build-latest-cache')
    .option(
      '-c, --chain <chain>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-b, --block <block>',
      'optional block number to start indexing from',
    )
    .showHelpAfterError()
    .action(async ({ chain, block }: { chain?: string; block?: string }) => {
      await startCacheBuilders({ chain, block, type: 'latest' })
    })

  program
    .command('build-cache')
    .option(
      '-c, --chain <chain>',
      'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
    )
    .option(
      '-b, --block <block>',
      'optional block number to start indexing from',
    )
    .showHelpAfterError()
    .action(async ({ chain, block }: { chain?: string; block?: string }) => {
      await startCacheBuilders({ chain, block, type: 'both' })
    })
}

async function startCacheBuilders({
  chain,
  block,
  type,
}: {
  chain?: string
  block?: string
  type: 'historic' | 'latest' | 'both'
}) {
  const filterChainIds = multiChainFilter(chain) ?? Object.values(EvmChain)

  if (filterChainIds.includes(Chain.Solana)) {
    throw new Error('Solana is not supported')
  }

  const startBlockOverride = block ? Number(block) : undefined

  const dbDirPath =
    process.env.DB_DIR_PATH ||
    path.resolve(import.meta.dirname, '../../../../databases')

  await Promise.all(
    filterChainIds.map(async (chainId) => {
      await runner(dbDirPath, chainId as EvmChain, type, startBlockOverride)
    }),
  )
}
