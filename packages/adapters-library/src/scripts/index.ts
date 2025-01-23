#!/usr/bin/env node
import { Command } from 'commander'
import { Chain } from '../core/constants/chains'
import { DefiProvider } from '../defiProvider'
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
import { featureCommands } from './featureCommands'
import { performance } from './performance'
import { simulateTxCommand } from './simulateTxCommand'
import { stressCommand } from './stress'
import { buildHistoricCache } from './addressContractCacheBuilder/buildHistoricCache'
import { multiChainFilter } from './commandFilters'

const program = new Command('mmi-adapters')

const defiProvider = new DefiProvider()
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

program
  .command('build-historic-cache')
  .option(
    '-c, --chains <chains>',
    'comma-separated chains filter (e.g. ethereum,arbitrum,linea)',
  )
  .option('-i, --initialize', 'Initialize the DB')
  .action(
    async ({
      initialize,
      chains,
    }: {
      initialize: boolean
      chains: string
    }) => {
      const filterChainIds = multiChainFilter(chains)

      console.log('Building historic cache', { filterChainIds, initialize })

      await Promise.all(
        (filterChainIds ?? [Chain.Ethereum]).map((chainId) => {
          if (chainId === Chain.Solana) {
            return
          }

          return buildHistoricCache(defiProvider, chainId, initialize)
        }),
      )
    },
  )

program.parseAsync()
