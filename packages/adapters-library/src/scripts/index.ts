#!/usr/bin/env node
import path from 'node:path'
import Database from 'better-sqlite3'
import { Database as DatabaseType } from 'better-sqlite3'
import { Command } from 'commander'
import {
  Chain,
  ChainIdToChainNameMap,
  EvmChain,
} from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
import { PoolFilter } from '../tokenFilter'
import { AdapterSettings } from '../types/adapter'
import { copyAdapter } from './adapterBuilder/copyAdapter'
import { newAdapterCommand } from './adapterBuilder/newAdapterCommand'
import { blockAverage } from './blockAverage'
import { buildMetadataDb } from './buildMetadataDb'
import { buildScoreboard } from './buildScoreboard'
import { buildSnapshots } from './buildSnapshots'
import { buildContractTypes } from './buildTypes'
import { checkBadSnapshots } from './checkBadSnapshots'
import { checkDbTotals } from './checkDbTotals'
import { checkMetadataType } from './checkMetadataType'
import { deleteAdapterMetadata } from './deleteAdapterMetadata'
import { detectEvents } from './detectEvents'
import { featureCommands } from './featureCommands'
import { performance } from './performance'
import { simulateTxCommand } from './simulateTxCommand'
import { stressCommand } from './stress'

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
const chainProviders = defiProvider.chainProvider.providers
const solanaProvider = defiProvider.chainProvider.solanaProvider
const adaptersController = defiProvider.adaptersController

featureCommands(program, defiProvider)

checkMetadataType(program, chainProviders, solanaProvider, adaptersController)

newAdapterCommand(program, defiProvider)

blockAverage(program, chainProviders)

buildContractTypes(program)

buildMetadataDb(program, chainProviders, solanaProvider, adaptersController)

deleteAdapterMetadata(program, chainProviders, adaptersController)

checkDbTotals(program, chainProviders, solanaProvider, adaptersController)

buildSnapshots(program, defiProvider)

checkBadSnapshots(program, defiProvider)

stressCommand(program, defiProvider)

simulateTxCommand(program, chainProviders)

performance(program)

buildScoreboard(program, defiProvider)

detectEvents(program, defiProvider)

program
  .command('copy-adapter')
  .argument('[sourceProtocolId]', 'Protocol to copy')
  .argument('[newProtocolId]', 'New protocol id (kebab-case)')
  .argument('[newProtocolKey]', 'New protocol Key (PascalCase)')
  .argument(
    '[chainKeys]',
    'List of chain keys to copy (e.g. Ethereum,Arbitrum,Linea',
  )
  .action(
    async (sourceProtocolId, newProtocolId, newProtocolKey, chainKeys) => {
      await copyAdapter({
        protocolKey: newProtocolKey,
        protocolId: newProtocolId,
        chainKeys: chainKeys.split(',') as (keyof typeof Chain)[],
        sourceProtocolId: sourceProtocolId,
        defiProvider,
      })
    },
  )

program.parseAsync()

function buildCachePoolFilter(
  dbs: Partial<Record<EvmChain, DatabaseType>>,
): PoolFilter {
  return async (
    userAddress: string,
    chainId: EvmChain,
    adapterSettings: AdapterSettings,
  ): Promise<string[] | undefined> => {
    const db = dbs[chainId]
    if (!db || adapterSettings.userEvent === false) {
      return undefined
    }

    const pendingPools = db
      .prepare(`
        SELECT 	contract_address
        FROM 	history_logs
        WHERE 	address = ?
        `)
      .all(userAddress.slice(2)) as {
      contract_address: string
    }[]

    return pendingPools.map((pool) => `0x${pool.contract_address}`)
  }
}

function setCloseDatabaseHandlers(db: DatabaseType) {
  const closeDatabase = () => db.close()

  process.on('SIGINT', () => {
    console.log('Received SIGINT. Closing database connection...')
    closeDatabase()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Closing database connection...')
    closeDatabase()
    process.exit(0)
  })

  process.on('exit', () => {
    closeDatabase()
  })
}
