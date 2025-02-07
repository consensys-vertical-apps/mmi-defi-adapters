#!/usr/bin/env node
import path from 'node:path'
import { DefiProvider } from '@metamask-institutional/defi-adapters'
import {
  Chain,
  ChainIdToChainNameMap,
} from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'
import { EvmChain } from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'
import {
  buildCachePoolFilter,
  buildHistoricCache,
  setCloseDatabaseHandlers,
} from '@metamask-institutional/workers'
import Database from 'better-sqlite3'
import { Command } from 'commander'
import { chainFilter } from './commandFilters.js'

const program = new Command('mmi-adapters')

const cachePoolFilter =
  process.env.DEFI_ADAPTERS_USE_POSITIONS_CACHE === 'true'
    ? buildCachePoolFilter(
        Object.values(EvmChain).reduce(
          (acc, chainId) => {
            const db = new Database(
              path.join(
                __dirname,
                '../../../../',
                `databases/${ChainIdToChainNameMap[chainId]}_index_history.db`,
              ),
              {
                readonly: true,
                fileMustExist: true,
                timeout: 5000,
              },
            )

            setCloseDatabaseHandlers(db)

            acc[chainId] = db

            return acc
          },
          {} as Record<EvmChain, Database.Database>,
        ),
      )
    : undefined

const defiProvider = new DefiProvider(
  undefined,
  undefined,
  undefined,
  cachePoolFilter,
)

program
  .command('build-historic-cache')
  .argument('[chain]', 'Chain to build cache for')
  .option('-i, --initialize', 'Initialize the DB')
  .action(
    async (
      chain,
      {
        initialize,
      }: {
        initialize: boolean
      },
    ) => {
      const chainId = chainFilter(chain)
      if (!chainId) {
        throw new Error('Chain is required')
      }

      if (chainId === Chain.Solana) {
        throw new Error('Solana is not supported')
      }

      console.log(`${new Date().toISOString()}: Building historic cache`, {
        chainId,
        initialize,
      })

      await buildHistoricCache(defiProvider, chainId)

      console.log('Finished')
      process.exit(0)
    },
  )

program.parseAsync()
