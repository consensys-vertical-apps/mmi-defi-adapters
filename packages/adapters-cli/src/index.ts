#!/usr/bin/env node
import path from 'node:path'
import { ChainName, DefiProvider } from '@metamask-institutional/defi-adapters'
import { Chain } from '@metamask-institutional/defi-adapters/dist/core/constants/chains.js'
import {
  buildHistoricCache,
  createDatabase,
  insertContractEntries,
} from '@metamask-institutional/workers'
import { Command } from 'commander'
import { chainFilter } from './command-filters.js'
import { JsonRpcProvider, Network } from 'ethers'

const program = new Command('mmi-adapters')

program
  .command('build-historic-cache')
  .argument('[chain]', 'Chain to build cache for')
  .action(async (chain) => {
    const chainId = chainFilter(chain)
    if (!chainId) {
      throw new Error('Chain is required')
    }

    if (chainId === Chain.Solana) {
      throw new Error('Solana is not supported')
    }

    const defiProvider = new DefiProvider()

    const providerUrl =
      defiProvider.chainProvider.providers[chainId]._getConnection().url

    const provider = new JsonRpcProvider(providerUrl, chainId, {
      staticNetwork: Network.from(chainId),
    })

    const dbDirPath =
      process.env.DB_DIR_PATH ||
      path.resolve(import.meta.dirname, '../../../databases')

    const db = createDatabase(dbDirPath, ChainName[chainId], {
      fileMustExist: false,
      readonly: false,
      timeout: 5000,
    })

    console.log(`${new Date().toISOString()}: Building historic cache`, {
      chainId,
    })

    // TODO: Have parameters to determine what pools to insert
    await insertContractEntries(defiProvider, chainId, db)

    await buildHistoricCache(provider, chainId, db)
  })

program.parseAsync()
